// Pure unit tests for the HeyGen avatar video provider — no emulator or
// network required. We mutate only the HeyGen config fields (the suite runs
// in a single fork, so replacing the whole config module would leak into
// other files) and stub global fetch to assert request shape + status mapping.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { config } from '../src/lib/config.js';
import { heygenAvatarProvider, fakeHeygenProvider, getHeygenVideoProvider } from '../src/providers/heygen.js';
import type { Brief } from '@megadon/types';
import type { CopyResult } from '../src/providers/types.js';

const saved = {
  heygenKey: config.heygenKey,
  heygenApiBase: config.heygenApiBase,
  heygenAvatarId: config.heygenAvatarId,
  heygenVoiceId: config.heygenVoiceId,
};

beforeEach(() => {
  config.heygenKey = 'test-key';
  config.heygenApiBase = 'https://api.heygen.test';
  config.heygenAvatarId = 'avatar-default';
  config.heygenVoiceId = 'voice-default';
});

afterEach(() => {
  Object.assign(config, saved);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const BRIEF: Brief = {
  goal: 'conversion',
  audience: { ageGroups: ['25-34'], interests: ['Fitness'] },
  offer: '20% off annual plans',
  platforms: ['instagram'],
  batchSize: 4,
  creativeStyle: 'bold',
  tones: ['Confident'],
  mediaType: 'video',
  videoStyle: 'avatar',
};

const COPY: CopyResult = {
  headline: 'Move faster',
  hook: 'Tired of slow ads?',
  body: 'Generate a whole batch in seconds.',
  cta: 'Start free today.',
};

describe('heygenAvatarProvider.kickoff', () => {
  it('posts to /v2/video/generate with the avatar, script and vertical dimension', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ error: null, data: { video_id: 'vid_123' } }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await heygenAvatarProvider.kickoff(BRIEF, 'instagram', COPY);
    expect(res).toEqual({ jobId: 'vid_123' });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.heygen.test/v2/video/generate');
    expect((init as RequestInit).method).toBe('POST');
    expect((init as any).headers['X-Api-Key']).toBe('test-key');

    const body = JSON.parse((init as any).body);
    expect(body.dimension).toEqual({ width: 720, height: 1280 });
    const input = body.video_inputs[0];
    expect(input.character).toEqual({ type: 'avatar', avatar_id: 'avatar-default', avatar_style: 'normal' });
    expect(input.voice.voice_id).toBe('voice-default');
    expect(input.voice.input_text).toContain('Tired of slow ads?');
    expect(input.voice.input_text).toContain('Start free today.');
  });

  it('uses horizontal dimension for feed platforms', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ error: null, data: { video_id: 'v' } }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await heygenAvatarProvider.kickoff(BRIEF, 'youtube', COPY);
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as any).body);
    expect(body.dimension).toEqual({ width: 1280, height: 720 });
  });

  it('throws when HeyGen returns no video_id', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ error: { code: 'x' }, data: null }), { status: 200 }),
    ));
    await expect(heygenAvatarProvider.kickoff(BRIEF, 'instagram', COPY)).rejects.toThrow();
  });
});

describe('heygenAvatarProvider.pollJob', () => {
  it('maps completed → ready with the video url', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ data: { status: 'completed', video_url: 'https://cdn/v.mp4' } }), { status: 200 }),
    ));
    expect(await heygenAvatarProvider.pollJob('vid_123')).toEqual({ status: 'ready', assetUrl: 'https://cdn/v.mp4' });
  });

  it('maps processing → pending', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ data: { status: 'processing' } }), { status: 200 }),
    ));
    expect(await heygenAvatarProvider.pollJob('vid_123')).toEqual({ status: 'pending' });
  });

  it('maps failed → failed with the error message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ data: { status: 'failed', error: { message: 'boom' } } }), { status: 200 }),
    ));
    expect(await heygenAvatarProvider.pollJob('vid_123')).toEqual({ status: 'failed', error: 'boom' });
  });
});

describe('getHeygenVideoProvider', () => {
  it('returns the fake provider under the emulator', () => {
    // The test env sets FIRESTORE_EMULATOR_HOST → isEmulator() is true.
    expect(getHeygenVideoProvider()).toBe(fakeHeygenProvider);
  });
});

describe('fakeHeygenProvider', () => {
  it('returns a synthetic asset immediately', async () => {
    const k = await fakeHeygenProvider.kickoff(BRIEF, 'instagram', COPY);
    expect(k.assetUrl).toBeTruthy();
    expect(await fakeHeygenProvider.pollJob('x')).toMatchObject({ status: 'ready' });
  });
});
