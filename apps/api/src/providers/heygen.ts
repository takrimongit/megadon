// HeyGen avatar (talking-spokesperson) video generation.
//   POST /v2/video/generate                → { data: { video_id } }
//   GET  /v1/video_status.get?video_id=…   → { data: { status, video_url, error } }
// Auth is an X-Api-Key header. Async: generate returns a video_id we poll
// until status === 'completed'. This plugs into the same VideoProvider
// contract as the Veo provider, so the poll loop is unchanged.

import { config } from '../lib/config.js';
import { AppError } from '../lib/errors.js';
import type { VideoProvider, BrandContext, CopyResult } from './types.js';
import { interpolateWithContext } from './interpolate.js';
import { generateVideoScript } from './kie.js';
import type { Brief, Platform } from '@megadon/types';

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
function dimensionFor(platform: Platform, hd: boolean): { width: number; height: number } {
  const horizontal = platform === 'youtube' || platform === 'linkedin' || platform === 'facebook';
  if (horizontal) return hd ? { width: 1920, height: 1080 } : { width: 1280, height: 720 };
  return hd ? { width: 1080, height: 1920 } : { width: 720, height: 1280 };
}

/**
 * One consistent, premium studio backdrop derived from the brand's primary
 * color. A talking head on a flat, fully-saturated brand color reads cheap and
 * "unnatural"; a single deep, desaturated tone reads like a real studio set —
 * and keeping it consistent across scenes (vs. flashing colors) feels calmer.
 */
function studioBackground(brand?: BrandContext | null): string {
  const colors = brand?.analysis?.colors ?? [];
  const primary = colors.find((c) => c.role === 'primary')?.hex ?? colors[0]?.hex ?? '#3525cd';
  const m = /^#?([a-f\d]{6})$/i.exec(primary);
  if (!m) return '#14161f';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  // Mix ~78% toward a deep neutral navy: stays subtly on-brand, never garish.
  const mix = (c: number, target: number) => Math.round(c * 0.22 + target * 0.78);
  const hex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${hex(mix(r, 15))}${hex(mix(g, 17))}${hex(mix(b, 28))}`;
}

/** Copy-derived scenes (hook → value → CTA) used when the script model is unavailable. */
function fallbackScenes(copy: CopyResult): string[] {
  const scenes = [copy.hook || copy.headline, copy.body, copy.cta]
    .map((s) => (s ?? '').trim())
    .filter((s) => s.length > 0);
  return scenes.length > 0 ? scenes : ['Discover what we have for you today.'];
}

/**
 * Resolve the spoken scene texts. A Geek-Mode template override wins (single
 * scene, interpolated). Otherwise ask the copy model for a hook→value→CTA
 * script, degrading to copy-derived scenes so video generation never fails
 * on a script hiccup.
 */
async function resolveScenes(
  brief: Brief,
  platform: Platform,
  copy: CopyResult,
  brand: BrandContext | null | undefined,
  revisionInstruction?: string,
  overrideTemplate?: string,
): Promise<string[]> {
  if (overrideTemplate && overrideTemplate.trim().length > 0) {
    return [interpolateWithContext(overrideTemplate, { brief, platform, copy, brand, revisionInstruction })];
  }
  try {
    const scenes = await generateVideoScript(brief, platform, brand, copy);
    if (scenes.length > 0) return scenes;
  } catch {
    // fall through to copy-derived scenes
  }
  return fallbackScenes(copy);
}

export const heygenAvatarProvider: VideoProvider = {
  async kickoff(brief, platform, copy, brand, opts) {
    const override = opts?.override;

    const avatarId =
      override?.model && override.model.trim().length > 0
        ? override.model.trim()
        : config.heygenAvatarId;
    if (!avatarId) throw AppError.provider('HEYGEN_AVATAR_ID not set');

    const scenes = await resolveScenes(
      brief, platform, copy, brand, opts?.revisionInstruction, override?.promptTemplate,
    );
    const background = studioBackground(brand);

    // One HeyGen "scene" per script beat — same avatar, one consistent studio
    // backdrop — so it reads as a single natural take rather than a slideshow.
    const video_inputs = scenes.map((text) => ({
      character: { type: 'avatar', avatar_id: avatarId, avatar_style: 'normal' },
      voice: {
        type: 'text',
        input_text: text,
        voice_id: config.heygenVoiceId,
        speed: config.heygenVoiceSpeed,
        ...(config.heygenVoiceEmotion ? { emotion: config.heygenVoiceEmotion } : {}),
      },
      background: { type: 'color', value: background },
    }));

    const json = await authedJson<GenerateResponse>('/v2/video/generate', {
      method: 'POST',
      body: JSON.stringify({
        title: (copy.headline || 'Avatar ad').slice(0, 100),
        caption: config.heygenCaptions, // burned-in subtitles for muted autoplay
        dimension: dimensionFor(platform, config.heygenHd),
        video_inputs,
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
