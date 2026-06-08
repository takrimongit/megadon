import { config } from '../lib/config.js';
import { AppError } from '../lib/errors.js';
import type { CreativeProvider } from './types.js';

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
  async kickoff(brief, platform, copy, brand) {
    const a = brand?.analysis;
    const promptParts = [
      `Ad creative for ${platform}.`,
      `Headline: ${copy.headline}.`,
      `Body: ${copy.body}.`,
      `Hook: ${copy.hook}.`,
      `Visual style: ${brief.creativeStyle}.`,
      `Tone: ${brief.tones.join(', ')}.`,
    ];
    if (brand?.info?.companyName) promptParts.push(`Brand: ${brand.info.companyName}.`);
    if (a?.visualStyle) promptParts.push(`Brand visual style: ${a.visualStyle}.`);
    if (a?.colors?.length) {
      promptParts.push(`Brand palette: ${a.colors.map((c) => c.hex).slice(0, 5).join(', ')}.`);
    }
    if (a?.creativeStyles?.length) {
      promptParts.push(`Approved creative styles: ${a.creativeStyles.join(', ')}.`);
    }
    const prompt = promptParts.join(' ');

    const json = await authedJson<CreateTaskResponse>('/jobs/createTask', {
      method: 'POST',
      body: JSON.stringify({
        model: config.kieImageModel,
        input: {
          prompt,
          aspect_ratio: '1:1',
          resolution: '1K',
        },
      }),
    });

    if (json.code !== 200 || !json.data?.taskId) {
      throw AppError.provider(`kie.ai image kickoff failed: ${json.msg ?? 'unknown'}`);
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
