// Pure unit tests for the OmniHuman avatar provider — no emulator/network.
// Stubs fetch and routes by URL through the whole pipeline
// (script → HeyGen portrait → ElevenLabs TTS → kie upload → OmniHuman).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { config } from '../src/lib/config.js';
import { omnihumanProvider, fakeOmnihumanProvider, getOmnihumanProvider } from '../src/providers/omnihuman.js';
import type { Brief } from '@megadon/types';
import type { CopyResult } from '../src/providers/types.js';

const saved = {
  kieKey: config.kieKey, heygenKey: config.heygenKey, heygenApiBase: config.heygenApiBase,
  elevenLabsKey: config.elevenLabsKey, elevenLabsVoiceId: config.elevenLabsVoiceId,
  omnihumanModel: config.omnihumanModel, omnihumanAvatarId: config.omnihumanAvatarId,
  kieUploadBase: config.kieUploadBase, avatarEngine: config.avatarEngine,
};

beforeEach(() => {
  config.kieKey = 'kie-key';
  config.heygenKey = 'hg-key';
  config.heygenApiBase = 'https://api.heygen.test';
  config.elevenLabsKey = 'el-key';
  config.elevenLabsVoiceId = 'voice-1';
  config.omnihumanModel = 'omnihuman-1-5';
  config.omnihumanAvatarId = 'avatar-xyz';
  config.kieUploadBase = 'https://upload.test';
});
afterEach(() => { Object.assign(config, saved); vi.unstubAllGlobals(); });

const BRIEF: Brief = {
  goal: 'conversion', audience: { ageGroups: ['25-34'], interests: ['Tech'] },
  offer: '20% off', platforms: ['instagram'], batchSize: 1, creativeStyle: 'bold',
  tones: ['Confident'], mediaType: 'video', videoStyle: 'avatar',
};
const COPY: CopyResult = { headline: 'Move faster', hook: 'Tired of slow ads?', body: 'Batch in seconds.', cta: 'Start free.' };

function routedFetch() {
  return vi.fn(async (url: string) => {
    const u = String(url);
    if (u.includes('/chat/completions')) // generateVideoScript short-circuits to fallback if this fails; give it a script
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"scenes":["Tired of slow ads? Make a whole batch in seconds."]}' } }] }), { status: 200 });
    if (u.includes('/v2/photo_avatar/')) return new Response(JSON.stringify({ data: { image_url: 'https://heygen/portrait.webp' } }), { status: 200 });
    if (u.includes('api.elevenlabs.io')) return new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 });
    if (u.includes('file-base64-upload')) return new Response(JSON.stringify({ data: { downloadUrl: 'https://kie/audio.mp3' } }), { status: 200 });
    if (u.includes('/jobs/createTask')) return new Response(JSON.stringify({ code: 200, msg: 'success', data: { taskId: 'task_1' } }), { status: 200 });
    if (u.includes('/jobs/recordInfo')) return new Response(JSON.stringify({ code: 200, msg: 'ok', data: { state: 'success', resultJson: '{"resultUrls":["https://cdn/vid.mp4"]}' } }), { status: 200 });
    return new Response('{}', { status: 200 });
  });
}

describe('omnihumanProvider.kickoff', () => {
  it('chains portrait + TTS + upload into an OmniHuman task', async () => {
    const fetchMock = routedFetch();
    vi.stubGlobal('fetch', fetchMock);

    const res = await omnihumanProvider.kickoff(BRIEF, 'instagram', COPY);
    expect(res).toEqual({ jobId: 'task_1' });

    // HeyGen portrait fetched for the configured avatar
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/v2/photo_avatar/avatar-xyz'))).toBe(true);
    // ElevenLabs called with the configured voice
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('api.elevenlabs.io/v1/text-to-speech/voice-1'))).toBe(true);

    const create = fetchMock.mock.calls.find((c) => String(c[0]).includes('/jobs/createTask'))!;
    const body = JSON.parse((create[1] as any).body);
    expect(body.model).toBe('omnihuman-1-5');
    expect(body.input.image_url).toBe('https://heygen/portrait.webp');
    expect(body.input.audio_url).toBe('https://kie/audio.mp3');
    expect(body.input.seed).toBe(42);
  });
});

describe('omnihumanProvider.pollJob', () => {
  it('maps success → ready with the video url', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ code: 200, data: { state: 'success', resultJson: '{"resultUrls":["https://cdn/v.mp4"]}' } }), { status: 200 })));
    expect(await omnihumanProvider.pollJob('t')).toEqual({ status: 'ready', assetUrl: 'https://cdn/v.mp4' });
  });
  it('maps generating → pending', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ code: 200, data: { state: 'generating' } }), { status: 200 })));
    expect(await omnihumanProvider.pollJob('t')).toEqual({ status: 'pending' });
  });
  it('maps fail → failed with message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ code: 200, data: { state: 'fail', failMsg: 'boom' } }), { status: 200 })));
    expect(await omnihumanProvider.pollJob('t')).toEqual({ status: 'failed', error: 'boom' });
  });
});

describe('getOmnihumanProvider', () => {
  it('returns the fake provider under the emulator', () => {
    expect(getOmnihumanProvider()).toBe(fakeOmnihumanProvider);
  });
});
