import { config } from '../lib/config.js';
import { AppError } from '../lib/errors.js';
import type { CreativeProvider } from './types.js';
import { buildImagePrompt, buildDesignedAdPrompt } from './brandPrompt.js';
import { interpolateWithContext } from './interpolate.js';
import type { Platform } from '@megadon/types';

// Vertical for short-form, 4:5 for feeds, square for LinkedIn — designed ads
// only (the composite path stays 1:1 so overlay coords are stable).
function designedAspect(platform: Platform): string {
  if (platform === 'tiktok' || platform === 'youtube') return '9:16';
  if (platform === 'instagram' || platform === 'facebook') return '4:5';
  return '1:1';
}

// kie.ai image generation is async:
//   POST /api/v1/jobs/createTask  → { taskId }
//   GET  /api/v1/jobs/recordInfo?taskId=...  → { state, resultJson }
// resultJson is a stringified JSON containing { resultUrls: [string] }.

const BASE = 'https://api.kie.ai/api/v1';

interface CreateTaskResponse {
  code: number;
  msg: string;
  data: { taskId: string } | null;
}

interface RecordInfoResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    state: 'waiting' | 'queuing' | 'generating' | 'success' | 'fail';
    resultJson?: string;
    failCode?: string;
    failMsg?: string;
  } | null;
}

async function authedJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!config.kieKey) throw AppError.provider('KIE_API_KEY not set');
  const resp = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      'Authorization': `Bearer ${config.kieKey}`,
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) throw AppError.provider(`kie.ai ${resp.status}: ${await resp.text()}`);
  return resp.json() as Promise<T>;
}

export const kieCreativeProvider: CreativeProvider = {
  async kickoff(brief, platform, copy, brand, opts) {
    const override = opts?.override;
    const hasTemplate = !!(override?.promptTemplate && override.promptTemplate.trim().length > 0);
    // Designed mode: a text-native model renders the whole ad. A Geek-Mode
    // prompt template always wins (the user is driving the prompt directly).
    const designed = config.kieImageDesigned && !hasTemplate;

    const promptInput = {
      brief,
      platform,
      copy,
      brand,
      revisionInstruction: opts?.revisionInstruction,
      creativeDirection: opts?.creativeDirection,
    };
    const prompt = hasTemplate
      ? interpolateWithContext(override!.promptTemplate!, promptInput)
      : designed
        ? buildDesignedAdPrompt(promptInput)
        : buildImagePrompt(promptInput);

    const model = override?.model && override.model.trim().length > 0
      ? override.model.trim()
      : designed ? config.kieDesignedImageModel : config.kieImageModel;

    const input = designed
      ? { prompt, aspect_ratio: designedAspect(platform), resolution: '2K', output_format: 'png' }
      : { prompt, aspect_ratio: '1:1', resolution: '1K' };

    const json = await authedJson<CreateTaskResponse>('/jobs/createTask', {
      method: 'POST',
      body: JSON.stringify({ model, input }),
    });

    if (json.code !== 200 || !json.data?.taskId) {
      throw AppError.provider(`kie.ai image kickoff (${model}) failed: ${json.msg ?? 'unknown'}`);
    }
    return { jobId: json.data.taskId };
  },

  async pollJob(jobId) {
    const json = await authedJson<RecordInfoResponse>(`/jobs/recordInfo?taskId=${encodeURIComponent(jobId)}`);
    if (json.code !== 200 || !json.data) {
      return { status: 'failed', error: json.msg ?? 'no data' };
    }

    const state = json.data.state;
    if (state === 'success') {
      try {
        const result = JSON.parse(json.data.resultJson ?? '{}') as { resultUrls?: string[] };
        const url = result.resultUrls?.[0];
        if (!url) return { status: 'failed', error: 'no resultUrl in success response' };
        return { status: 'ready', assetUrl: url };
      } catch {
        return { status: 'failed', error: 'malformed resultJson' };
      }
    }
    if (state === 'fail') {
      return { status: 'failed', error: json.data.failMsg ?? json.data.failCode ?? 'unknown' };
    }
    return { status: 'pending' };
  },
};

// Fake provider used by tests & dev emulator runs — returns a static asset.
export const fakeCreativeProvider: CreativeProvider = {
  async kickoff() {
    return { assetUrl: 'https://placehold.co/1080x1080/3525cd/ffffff?text=AdForge' };
  },
  async pollJob() {
    return { status: 'ready', assetUrl: 'https://placehold.co/1080x1080/3525cd/ffffff?text=AdForge' };
  },
};

export function getCreativeProvider(): CreativeProvider {
  if (config.isEmulator() || !config.kieKey) return fakeCreativeProvider;
  return kieCreativeProvider;
}
