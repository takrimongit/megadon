// Pure unit tests for the cinematic kie helpers + storyboard normalization.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { config } from '../src/lib/config.js';
import { startVeoI2V, extendVeo, pollVeo, pollImage, startSceneImage, cinematicAspect } from '../src/providers/cinematic.js';
import { generateStoryboard } from '../src/providers/kie.js';
import type { Brief } from '@megadon/types';

const saved = { kieKey: config.kieKey, cinematicVeoModel: config.cinematicVeoModel, cinematicImageModel: config.cinematicImageModel };
beforeEach(() => { config.kieKey = 'k'; config.cinematicVeoModel = 'veo3_fast'; config.cinematicImageModel = 'nano-banana-2'; });
afterEach(() => { Object.assign(config, saved); vi.unstubAllGlobals(); });

const BRIEF: Brief = { goal: 'awareness', audience: { ageGroups: ['25-34'], interests: ['Tech'] }, offer: 'Cloud trial', platforms: ['instagram'], batchSize: 1, creativeStyle: 'bold', tones: ['Pro'], mediaType: 'video' };

describe('cinematic kie helpers', () => {
  it('startVeoI2V posts imageUrls + FIRST_AND_LAST_FRAMES + veo model', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ code: 200, data: { taskId: 't' } }), { status: 200 }));
    vi.stubGlobal('fetch', f);
    await startVeoI2V('https://img', 'dolly forward', 'youtube');
    const body = JSON.parse((f.mock.calls[0][1] as any).body);
    expect(body.imageUrls).toEqual(['https://img']);
    expect(body.generationType).toBe('FIRST_AND_LAST_FRAMES_2_VIDEO');
    expect(body.model).toBe('veo3_fast');
    expect(body.aspect_ratio).toBe('16:9'); // youtube → horizontal
  });

  it('extendVeo maps veo3_fast → fast', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ code: 200, data: { taskId: 't2' } }), { status: 200 }));
    vi.stubGlobal('fetch', f);
    expect(await extendVeo('t1', 'continue')).toBe('t2');
    const body = JSON.parse((f.mock.calls[0][1] as any).body);
    expect(body).toMatchObject({ taskId: 't1', model: 'fast' });
  });

  it('extendVeo maps lite/quality', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ code: 200, data: { taskId: 'x' } }), { status: 200 })));
    config.cinematicVeoModel = 'veo3_lite';
    let body: any;
    vi.stubGlobal('fetch', vi.fn(async (_u: string, i: any) => { body = JSON.parse(i.body); return new Response(JSON.stringify({ code: 200, data: { taskId: 'x' } }), { status: 200 }); }));
    await extendVeo('t', 'p'); expect(body.model).toBe('lite');
    config.cinematicVeoModel = 'veo3'; await extendVeo('t', 'p'); expect(body.model).toBe('quality');
  });

  it('pollVeo maps successFlag', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ code: 200, data: { successFlag: 1, response: { resultUrls: ['https://v.mp4'] } } }), { status: 200 })));
    expect(await pollVeo('t')).toEqual({ status: 'ready', url: 'https://v.mp4' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ code: 200, data: { successFlag: 0 } }), { status: 200 })));
    expect(await pollVeo('t')).toEqual({ status: 'pending' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ code: 200, data: { successFlag: 2, errorMessage: 'boom' } }), { status: 200 })));
    expect(await pollVeo('t')).toEqual({ status: 'failed', error: 'boom' });
  });

  it('pollImage maps jobs state', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ code: 200, data: { state: 'success', resultJson: '{"resultUrls":["https://i.jpg"]}' } }), { status: 200 })));
    expect(await pollImage('t')).toEqual({ status: 'ready', url: 'https://i.jpg' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ code: 200, data: { state: 'generating' } }), { status: 200 })));
    expect(await pollImage('t')).toEqual({ status: 'pending' });
  });

  it('startSceneImage uses the cinematic image model', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ code: 200, data: { taskId: 'img' } }), { status: 200 }));
    vi.stubGlobal('fetch', f);
    expect(await startSceneImage('a corridor', 'instagram')).toBe('img');
    const body = JSON.parse((f.mock.calls[0][1] as any).body);
    expect(body.model).toBe('nano-banana-2');
    expect(body.input.aspect_ratio).toBe('9:16'); // instagram → vertical
  });

  it('cinematicAspect', () => {
    expect(cinematicAspect('youtube')).toBe('16:9');
    expect(cinematicAspect('tiktok')).toBe('9:16');
  });
});

describe('generateStoryboard', () => {
  it('normalizes to exactly the requested segment count', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: '{"imagePrompt":"a glowing data center corridor","segments":["dolly in","reveal hall","rise up"]}' } }] }), { status: 200 })));
    const out = await generateStoryboard(BRIEF, 'instagram', null, undefined, 8);
    expect(out.imagePrompt).toContain('corridor');
    expect(out.segments).toHaveLength(8); // 3 returned → padded to 8
    const out2 = await generateStoryboard(BRIEF, 'instagram', null, undefined, 2);
    expect(out2.segments).toHaveLength(2); // 3 returned → truncated to 2
  });
});
