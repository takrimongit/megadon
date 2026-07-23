// OmniHuman avatar video — animate a HeyGen photo-avatar portrait into a lively,
// moving presenter (talks, gestures, blinks). Pipeline (each step validated):
//   1. short spoken script (kie chat)
//   2. HeyGen GET /v2/photo_avatar/{id}     → portrait image_url (OmniHuman-fetchable)
//   3. ElevenLabs TTS (direct)              → mp3 bytes  (kie's ElevenLabs relay is broken)
//   4. kie file-base64-upload               → hosted audio url
//   5. kie OmniHuman createTask             → taskId, polled like the Veo path
// All heavy work runs on kie's servers, so no local ffmpeg/OOM risk.

import { config } from '../lib/config.js';
import { AppError } from '../lib/errors.js';
import type { VideoProvider, CopyResult, BrandContext } from './types.js';
import { interpolateWithContext } from './interpolate.js';
import { generateVideoScript } from './kie.js';
import type { Brief, Platform } from '@megadon/types';

const KIE_BASE = 'https://api.kie.ai/api/v1';
const OMNIHUMAN_PROMPT =
  'confident presenter talking to camera, natural hand gestures, subtle head and body movement, lively, professional';

interface KieCreate { code: number; msg: string; data: { taskId: string } | null }
interface KieRecord {
  code: number; msg: string;
  data: { state: 'waiting' | 'queuing' | 'generating' | 'success' | 'fail'; resultJson?: string; failMsg?: string } | null;
}

async function kie<T>(path: string, init?: RequestInit): Promise<T> {
  if (!config.kieKey) throw AppError.provider('KIE_API_KEY not set');
  const resp = await fetch(`${KIE_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${config.kieKey}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!resp.ok) throw AppError.provider(`kie ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  return resp.json() as Promise<T>;
}

/** HeyGen talking-photo avatar → portrait image URL. */
async function fetchAvatarImage(): Promise<string> {
  if (!config.heygenKey) throw AppError.provider('HEYGEN_API_KEY not set');
  const resp = await fetch(`${config.heygenApiBase}/v2/photo_avatar/${config.omnihumanAvatarId}`, {
    headers: { 'X-Api-Key': config.heygenKey },
  });
  if (!resp.ok) throw AppError.provider(`HeyGen photo_avatar ${resp.status}`);
  const j = (await resp.json()) as { data?: { image_url?: string } };
  if (!j.data?.image_url) throw AppError.provider('HeyGen photo_avatar: no image_url');
  return j.data.image_url;
}

/** ElevenLabs TTS (direct) → mp3 bytes. */
async function synthesizeSpeech(text: string): Promise<Buffer> {
  if (!config.elevenLabsKey) throw AppError.provider('ELEVENLABS_API_KEY not set');
  const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${config.elevenLabsVoiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': config.elevenLabsKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: config.elevenLabsModel }),
  });
  if (!resp.ok) throw AppError.provider(`ElevenLabs ${resp.status}: ${(await resp.text()).slice(0, 150)}`);
  return Buffer.from(await resp.arrayBuffer());
}

/** Host the mp3 in kie → a fetchable URL (auto-deletes after 3 days). */
async function hostAudio(buf: Buffer, fileName: string): Promise<string> {
  const resp = await fetch(`${config.kieUploadBase}/api/file-base64-upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.kieKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base64Data: `data:audio/mpeg;base64,${buf.toString('base64')}`,
      uploadPath: 'adforge-audio',
      fileName,
    }),
  });
  if (!resp.ok) throw AppError.provider(`kie upload ${resp.status}`);
  const j = (await resp.json()) as { data?: { downloadUrl?: string; fileUrl?: string; url?: string } };
  const url = j.data?.downloadUrl || j.data?.fileUrl || j.data?.url;
  if (!url) throw AppError.provider('kie upload: no url in response');
  return url;
}

/** OmniHuman audio should be ≤15s, so keep the spoken script to one short beat. */
function shorten(text: string, maxWords = 42): string {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  return words.length <= maxWords ? words.join(' ') : words.slice(0, maxWords).join(' ');
}

async function buildScript(
  brief: Brief, platform: Platform, copy: CopyResult, brand: BrandContext | null | undefined,
  opts: Parameters<VideoProvider['kickoff']>[4],
): Promise<string> {
  const override = opts?.override;
  if (override?.promptTemplate && override.promptTemplate.trim().length > 0) {
    return shorten(interpolateWithContext(override.promptTemplate, {
      brief, platform, copy, brand, revisionInstruction: opts?.revisionInstruction,
    }));
  }
  try {
    const scenes = await generateVideoScript(brief, platform, brand, copy);
    if (scenes.length > 0) return shorten(scenes.join(' '));
  } catch {
    // fall through to copy-derived script
  }
  return shorten([copy.hook || copy.headline, copy.cta].map((s) => (s ?? '').trim()).filter(Boolean).join(' ')
    || 'Discover what we built for you today.');
}

export const omnihumanProvider: VideoProvider = {
  async kickoff(brief, platform, copy, brand, opts) {
    const script = await buildScript(brief, platform, copy, brand, opts);
    const [imageUrl, audioBytes] = await Promise.all([fetchAvatarImage(), synthesizeSpeech(script)]);
    const audioUrl = await hostAudio(audioBytes, `ad-${Date.now()}.mp3`);

    const json = await kie<KieCreate>('/jobs/createTask', {
      method: 'POST',
      body: JSON.stringify({
        model: config.omnihumanModel,
        input: { image_url: imageUrl, audio_url: audioUrl, prompt: OMNIHUMAN_PROMPT, resolution: 720, seed: 42 },
      }),
    });
    if (json.code !== 200 || !json.data?.taskId) {
      throw AppError.provider(`OmniHuman kickoff failed: ${json.msg ?? 'no taskId'}`);
    }
    return { jobId: json.data.taskId };
  },

  async pollJob(jobId) {
    const json = await kie<KieRecord>(`/jobs/recordInfo?taskId=${encodeURIComponent(jobId)}`);
    if (json.code !== 200 || !json.data) return { status: 'failed', error: json.msg ?? 'no data' };
    const state = json.data.state;
    if (state === 'success') {
      try {
        const url = (JSON.parse(json.data.resultJson || '{}') as { resultUrls?: string[] }).resultUrls?.[0];
        if (!url) return { status: 'failed', error: 'no resultUrl in success response' };
        return { status: 'ready', assetUrl: url };
      } catch {
        return { status: 'failed', error: 'malformed resultJson' };
      }
    }
    if (state === 'fail') return { status: 'failed', error: json.data.failMsg ?? 'OmniHuman generation failed' };
    return { status: 'pending' };
  },
};

// Fake provider for emulator + tests.
export const fakeOmnihumanProvider: VideoProvider = {
  async kickoff() {
    return { assetUrl: 'https://placehold.co/720x1280/831ada/ffffff.mp4?text=Avatar' };
  },
  async pollJob() {
    return { status: 'ready', assetUrl: 'https://placehold.co/720x1280/831ada/ffffff.mp4?text=Avatar' };
  },
};

export function getOmnihumanProvider(): VideoProvider {
  if (config.isEmulator() || !config.kieKey) return fakeOmnihumanProvider;
  return omnihumanProvider;
}
