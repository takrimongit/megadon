// kie call helpers for the cinematic video pipeline:
//   nano-banana scene image → Veo 3.1 image-to-video (8s) → Veo extend (~7s each).
// Validated: extend returns the FULL cumulative video, so kie joins the beats —
// no local concat/ffmpeg needed. The chaining/state lives in jobs/cinematicVideo.ts.

import { config } from '../lib/config.js';
import { AppError } from '../lib/errors.js';
import type { Platform } from '@megadon/types';

const BASE = 'https://api.kie.ai/api/v1';

async function post<T>(path: string, body: unknown): Promise<T> {
  if (!config.kieKey) throw AppError.provider('KIE_API_KEY not set');
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.kieKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw AppError.provider(`kie ${path} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json() as Promise<T>;
}
async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${config.kieKey}` } });
  if (!r.ok) throw AppError.provider(`kie ${path} ${r.status}`);
  return r.json() as Promise<T>;
}

export function cinematicAspect(platform: Platform): '16:9' | '9:16' {
  return platform === 'youtube' || platform === 'linkedin' || platform === 'facebook' ? '16:9' : '9:16';
}

/** Veo /extend uses model 'fast'|'quality'|'lite' (not the veo3_* generate names). */
function extendModel(veoModel: string): 'fast' | 'quality' | 'lite' {
  if (veoModel.includes('lite')) return 'lite';
  if (veoModel === 'veo3') return 'quality';
  return 'fast';
}

export type PollResult = { status: 'pending' | 'ready' | 'failed'; url?: string; error?: string };

interface JobCreate { code: number; msg: string; data: { taskId: string } | null }
interface JobRecord { code: number; data: { state: string; resultJson?: string; failMsg?: string } | null }
interface VeoRecord { code: number; data: { successFlag: number; errorMessage?: string; response?: { resultUrls?: string[]; fullResultUrls?: string[] } } | null }

/** nano-banana cinematic opening-frame image → taskId. */
export async function startSceneImage(prompt: string, platform: Platform): Promise<string> {
  const j = await post<JobCreate>('/jobs/createTask', {
    model: config.cinematicImageModel,
    input: { prompt, aspect_ratio: cinematicAspect(platform), output_format: 'jpg', resolution: '2K' },
  });
  if (j.code !== 200 || !j.data?.taskId) throw AppError.provider(`scene image failed: ${j.msg}`);
  return j.data.taskId;
}
export async function pollImage(taskId: string): Promise<PollResult> {
  const j = await get<JobRecord>(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`);
  const st = j.data?.state;
  if (st === 'success') {
    const url = (JSON.parse(j.data!.resultJson || '{}') as { resultUrls?: string[] }).resultUrls?.[0];
    return url ? { status: 'ready', url } : { status: 'failed', error: 'no image url' };
  }
  if (st === 'fail') return { status: 'failed', error: j.data?.failMsg ?? 'image failed' };
  return { status: 'pending' };
}

/** Veo 3.1 image-to-video (8s, the image as the opening frame) → taskId. */
export async function startVeoI2V(imageUrl: string, prompt: string, platform: Platform): Promise<string> {
  const j = await post<JobCreate>('/veo/generate', {
    prompt, model: config.cinematicVeoModel, imageUrls: [imageUrl],
    generationType: 'FIRST_AND_LAST_FRAMES_2_VIDEO', aspect_ratio: cinematicAspect(platform), resolution: '720p',
  });
  if (j.code !== 200 || !j.data?.taskId) throw AppError.provider(`veo i2v failed: ${j.msg}`);
  return j.data.taskId;
}
/** Extend an existing Veo task by ~7s → new taskId (result is the full cumulative video). */
export async function extendVeo(taskId: string, prompt: string): Promise<string> {
  const j = await post<JobCreate>('/veo/extend', { taskId, prompt, model: extendModel(config.cinematicVeoModel) });
  if (j.code !== 200 || !j.data?.taskId) throw AppError.provider(`veo extend failed: ${j.msg}`);
  return j.data.taskId;
}
export async function pollVeo(taskId: string): Promise<PollResult> {
  const j = await get<VeoRecord>(`/veo/record-info?taskId=${encodeURIComponent(taskId)}`);
  const flag = j.data?.successFlag;
  if (flag === 1) {
    const url = j.data?.response?.fullResultUrls?.[0] ?? j.data?.response?.resultUrls?.[0];
    return url ? { status: 'ready', url } : { status: 'failed', error: 'no video url' };
  }
  if (flag === 2 || flag === 3) return { status: 'failed', error: j.data?.errorMessage ?? 'veo failed' };
  return { status: 'pending' };
}
