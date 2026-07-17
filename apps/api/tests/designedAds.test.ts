// Pure unit tests for the text-native "designed ad" path — the prompt that
// asks the model to render the whole ad, and the kie createTask request shape.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { config } from '../src/lib/config.js';
import { buildDesignedAdPrompt } from '../src/providers/brandPrompt.js';
import { kieCreativeProvider } from '../src/providers/creative.js';
import type { Brief } from '@megadon/types';
import type { CopyResult, BrandContext } from '../src/providers/types.js';

const BRIEF: Brief = {
  goal: 'conversion',
  audience: { ageGroups: ['25-34'], interests: ['Fitness'] },
  offer: '20% off annual plans',
  platforms: ['instagram'],
  batchSize: 4,
  creativeStyle: 'bold',
  tones: ['Confident'],
  mediaType: 'image',
};

const COPY: CopyResult = {
  headline: 'Move faster',
  hook: 'Tired of slow ads?',
  body: 'Generate a whole batch in seconds.',
  cta: 'Start free today.',
};

const BRAND: BrandContext = {
  info: { companyName: 'Helpables', industry: 'AI agency', description: 'x', websiteUrl: '' } as any,
  analysis: { colors: [{ hex: '#3525cd', name: 'Indigo', role: 'primary' }] } as any,
  assets: [],
};

describe('buildDesignedAdPrompt', () => {
  it('renders the exact copy and asks for integrated typography', () => {
    const prompt = buildDesignedAdPrompt({ brief: BRIEF, platform: 'instagram', copy: COPY, brand: BRAND, creativeDirection: 'bold-graphic' });
    expect(prompt).toContain('"Move faster"');
    expect(prompt).toContain('"Start free today."');
    expect(prompt).toContain('"Helpables"');
    expect(prompt).toContain('ART DIRECTION — Bold Graphic');
    // The opposite of the composite prompt — it must NOT forbid text.
    expect(prompt).not.toContain('DO NOT include ANY text');
    expect(prompt).toContain('render this text EXACTLY');
  });
});

describe('kieCreativeProvider designed mode', () => {
  const saved = { kieKey: config.kieKey, kieImageDesigned: config.kieImageDesigned, kieDesignedImageModel: config.kieDesignedImageModel };
  beforeEach(() => {
    config.kieKey = 'test-key';
    config.kieImageDesigned = true;
    config.kieDesignedImageModel = 'nano-banana-2';
  });
  afterEach(() => {
    Object.assign(config, saved);
    vi.unstubAllGlobals();
  });

  it('creates a nano-banana-2 task with the designed prompt + png output', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ code: 200, msg: 'ok', data: { taskId: 't1' } }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await kieCreativeProvider.kickoff(BRIEF, 'instagram', COPY, BRAND, { creativeDirection: 'bold-graphic' });
    expect(res).toEqual({ jobId: 't1' });

    const body = JSON.parse((fetchMock.mock.calls[0]![1] as any).body);
    expect(body.model).toBe('nano-banana-2');
    expect(body.input.output_format).toBe('png');
    expect(body.input.resolution).toBe('2K');
    expect(body.input.aspect_ratio).toBe('4:5'); // instagram
    expect(body.input.prompt).toContain('"Move faster"');
  });

  it('falls back to the composite model when designed mode is off', async () => {
    config.kieImageDesigned = false;
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ code: 200, msg: 'ok', data: { taskId: 't2' } }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await kieCreativeProvider.kickoff(BRIEF, 'instagram', COPY, BRAND, {});
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as any).body);
    expect(body.model).toBe(config.kieImageModel);
    expect(body.input.aspect_ratio).toBe('1:1');
    expect(body.input.prompt).toContain('DO NOT include ANY text');
  });
});
