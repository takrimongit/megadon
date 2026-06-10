// kie.ai Veo 3.1 video generation.
//   POST /api/v1/veo/generate            → { taskId }
//   GET  /api/v1/veo/record-info?taskId  → { successFlag (0/1/2/3), response.fullResultUrls }
// Response shape is different from the image task pattern — successFlag is
// an integer rather than a state string.

import { config } from '../lib/config.js';
import { AppError } from '../lib/errors.js';
import type { VideoProvider } from './types.js';
import { buildImagePrompt } from './brandPrompt.js';
import type { Platform } from '@megadon/types';

const BASE = 'https://api.kie.ai/api/v1';

interface VeoCreateResponse {
  code: number;
  msg: string;
  data: { taskId: string } | null;
}

interface VeoRecordResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    successFlag: number;
    errorMessage?: string | null;
    response?: {
      taskId?: string;
      resultUrls?: string[];
      fullResultUrls?: string[];
      resolution?: string;
    } | null;
  } | null;
}

async function authedJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!config.kieKey) throw AppError.provider('KIE_API_KEY not set');
  const resp = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${config.kieKey}`,
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) {
    throw AppError.provider(`kie.ai veo ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  }
  return resp.json() as Promise<T>;
}

function aspectFor(platform: Platform): '16:9' | '9:16' {
  // Instagram/TikTok/Reels = vertical. YouTube/LinkedIn feed = horizontal.
  if (platform === 'youtube' || platform === 'linkedin' || platform === 'facebook') {
    return '16:9';
  }
  return '9:16';
}

export const kieVideoProvider: VideoProvider = {
  async kickoff(brief, platform, copy, brand, opts) {
    // Reuse the image prompt builder — it produces a structured brief that
    // works well for text-to-video too, but rephrase the STRICT CONSTRAINTS
    // since text/logo compositing on a video frame isn't possible.
    const stillPrompt = buildImagePrompt({ brief, platform, copy, brand, revisionInstruction: opts?.revisionInstruction });
    // Replace the "no text, leave bottom 25% empty" wording with motion-
    // focused direction since video can legibly show text in-camera.
    const videoPrompt = stillPrompt
      .replace(
        /STRICT CONSTRAINTS[\s\S]*?(?=\n\n[A-Z]|$)/,
        [
          'STRICT CONSTRAINTS:',
          '- Photorealistic, cinematic camera movement (subtle, no shaky motion)',
          '- Keep typography and logos out of the video itself — they will be presented in the app UI alongside the video',
          '- No watermarks or signatures',
          '- Smooth, premium pacing',
        ].join('\n'),
      )
      .concat(
        '\n\nMOTION DIRECTION:\n- Establish the scene in the first 2 seconds, then a subtle parallax/dolly move\n- End on a stable beauty shot that holds the brand mood',
      );

    const json = await authedJson<VeoCreateResponse>('/veo/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt: videoPrompt,
        model: config.kieVideoModel,
        generationType: 'TEXT_2_VIDEO',
        aspect_ratio: aspectFor(platform),
        resolution: '720p',
        duration: 6,
        enableTranslation: false,
      }),
    });

    if (json.code !== 200 || !json.data?.taskId) {
      throw AppError.provider(`kie.ai veo kickoff failed: ${json.msg ?? 'unknown'}`);
    }
    return { jobId: json.data.taskId };
  },

  async pollJob(jobId) {
    const json = await authedJson<VeoRecordResponse>(
      `/veo/record-info?taskId=${encodeURIComponent(jobId)}`,
    );
    if (json.code !== 200 || !json.data) {
      return { status: 'failed', error: json.msg ?? 'no data' };
    }
    const flag = json.data.successFlag;
    if (flag === 1) {
      const url =
        json.data.response?.fullResultUrls?.[0] ??
        json.data.response?.resultUrls?.[0];
      if (!url) return { status: 'failed', error: 'no resultUrl in success response' };
      return { status: 'ready', assetUrl: url };
    }
    if (flag === 2 || flag === 3) {
      return { status: 'failed', error: json.data.errorMessage ?? 'Veo generation failed' };
    }
    return { status: 'pending' };
  },
};

// Fake video provider for emulator + tests.
export const fakeVideoProvider: VideoProvider = {
  async kickoff() {
    return { assetUrl: 'https://placehold.co/720x1280/3525cd/ffffff.mp4?text=AdForge' };
  },
  async pollJob() {
    return { status: 'ready', assetUrl: 'https://placehold.co/720x1280/3525cd/ffffff.mp4?text=AdForge' };
  },
};

export function getVideoProvider(): VideoProvider {
  if (config.isEmulator() || !config.kieKey) return fakeVideoProvider;
  return kieVideoProvider;
}
