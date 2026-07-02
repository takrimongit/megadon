// HeyGen avatar (talking-spokesperson) video generation.
//   POST /v2/video/generate                → { data: { video_id } }
//   GET  /v1/video_status.get?video_id=…   → { data: { status, video_url, error } }
// Auth is an X-Api-Key header. Async: generate returns a video_id we poll
// until status === 'completed'. This plugs into the same VideoProvider
// contract as the Veo provider, so the poll loop is unchanged.

import { config } from '../lib/config.js';
import { AppError } from '../lib/errors.js';
import type { VideoProvider } from './types.js';
import { interpolateWithContext } from './interpolate.js';
import type { Platform } from '@megadon/types';

interface GenerateResponse {
  error: unknown | null;
  data: { video_id: string } | null;
}

interface StatusResponse {
  data: {
    status: 'pending' | 'processing' | 'waiting' | 'completed' | 'failed';
    video_url?: string | null;
    error?: { message?: string; detail?: string } | string | null;
  } | null;
  error?: unknown;
}

async function authedJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!config.heygenKey) throw AppError.provider('HEYGEN_API_KEY not set');
  const resp = await fetch(`${config.heygenApiBase}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      'X-Api-Key': config.heygenKey,
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) {
    throw AppError.provider(`HeyGen ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  }
  return resp.json() as Promise<T>;
}

/** Vertical for Reels/TikTok, horizontal for feed/YouTube — mirrors the Veo provider. */
function dimensionFor(platform: Platform): { width: number; height: number } {
  if (platform === 'youtube' || platform === 'linkedin' || platform === 'facebook') {
    return { width: 1280, height: 720 };
  }
  return { width: 720, height: 1280 };
}

/** Turn the ad copy into a short spoken script for the avatar to narrate. */
function buildDefaultScript(copy: { hook?: string; headline?: string; body?: string; cta?: string }): string {
  const parts = [copy.hook || copy.headline, copy.body, copy.cta]
    .map((s) => (s ?? '').trim())
    .filter((s) => s.length > 0);
  const script = parts.join(' ');
  // Keep narration tight — a few sentences is plenty for a social ad.
  return script.length > 700 ? `${script.slice(0, 697)}...` : script || 'Discover what we have for you today.';
}

export const heygenAvatarProvider: VideoProvider = {
  async kickoff(brief, platform, copy, brand, opts) {
    const override = opts?.override;

    const avatarId =
      override?.model && override.model.trim().length > 0
        ? override.model.trim()
        : config.heygenAvatarId;
    if (!avatarId) throw AppError.provider('HEYGEN_AVATAR_ID not set');

    const script =
      override?.promptTemplate && override.promptTemplate.trim().length > 0
        ? interpolateWithContext(override.promptTemplate, {
            brief, platform, copy, brand, revisionInstruction: opts?.revisionInstruction,
          })
        : buildDefaultScript(copy);

    const dimension = dimensionFor(platform);

    const json = await authedJson<GenerateResponse>('/v2/video/generate', {
      method: 'POST',
      body: JSON.stringify({
        video_inputs: [
          {
            character: { type: 'avatar', avatar_id: avatarId, avatar_style: 'normal' },
            voice: { type: 'text', input_text: script, voice_id: config.heygenVoiceId },
          },
        ],
        dimension,
      }),
    });

    if (json.error || !json.data?.video_id) {
      throw AppError.provider(`HeyGen kickoff failed: ${JSON.stringify(json.error ?? 'no video_id')}`);
    }
    return { jobId: json.data.video_id };
  },

  async pollJob(jobId) {
    const json = await authedJson<StatusResponse>(
      `/v1/video_status.get?video_id=${encodeURIComponent(jobId)}`,
    );
    const data = json.data;
    if (!data) return { status: 'failed', error: 'no status data' };

    if (data.status === 'completed') {
      if (!data.video_url) return { status: 'failed', error: 'completed without video_url' };
      return { status: 'ready', assetUrl: data.video_url };
    }
    if (data.status === 'failed') {
      const err = typeof data.error === 'string' ? data.error : data.error?.message ?? 'HeyGen generation failed';
      return { status: 'failed', error: err };
    }
    return { status: 'pending' };
  },
};

// Fake avatar provider for emulator + tests.
export const fakeHeygenProvider: VideoProvider = {
  async kickoff() {
    return { assetUrl: 'https://placehold.co/720x1280/831ada/ffffff.mp4?text=Avatar' };
  },
  async pollJob() {
    return { status: 'ready', assetUrl: 'https://placehold.co/720x1280/831ada/ffffff.mp4?text=Avatar' };
  },
};

export function getHeygenVideoProvider(): VideoProvider {
  if (config.isEmulator() || !config.heygenKey) return fakeHeygenProvider;
  return heygenAvatarProvider;
}
