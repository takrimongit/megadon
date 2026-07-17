// Pure unit tests for creative-direction variety and its effect on the
// image prompt. No emulator/network.

import { describe, it, expect } from 'vitest';
import {
  CREATIVE_DIRECTIONS,
  pickDirection,
  getDirection,
} from '../src/providers/creativeDirections.js';
import { buildImagePrompt } from '../src/providers/brandPrompt.js';
import type { Brief } from '@megadon/types';
import type { CopyResult } from '../src/providers/types.js';

const BRIEF: Brief = {
  goal: 'conversion',
  audience: { ageGroups: ['25-34'], interests: ['Fitness'] },
  offer: '20% off annual plans',
  platforms: ['instagram'],
  batchSize: 8,
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

describe('creative directions', () => {
  it('exposes several distinct directions', () => {
    expect(CREATIVE_DIRECTIONS.length).toBeGreaterThanOrEqual(6);
    const ids = new Set(CREATIVE_DIRECTIONS.map((d) => d.id));
    expect(ids.size).toBe(CREATIVE_DIRECTIONS.length); // all unique
  });

  it('rotates across a batch so consecutive slots differ', () => {
    const picks = Array.from({ length: CREATIVE_DIRECTIONS.length }, (_, i) => pickDirection(i, 0).id);
    expect(new Set(picks).size).toBe(CREATIVE_DIRECTIONS.length); // a full cycle covers all
    expect(pickDirection(0, 0).id).not.toBe(pickDirection(1, 0).id);
  });

  it('wraps and stays in range for any index/offset', () => {
    const n = CREATIVE_DIRECTIONS.length;
    expect(pickDirection(n, 0).id).toBe(pickDirection(0, 0).id);
    expect(pickDirection(0, 3).id).toBe(CREATIVE_DIRECTIONS[3 % n]!.id);
  });

  it('getDirection resolves ids and ignores unknowns', () => {
    expect(getDirection(CREATIVE_DIRECTIONS[0]!.id)?.id).toBe(CREATIVE_DIRECTIONS[0]!.id);
    expect(getDirection('nope')).toBeUndefined();
    expect(getDirection(null)).toBeUndefined();
  });
});

describe('buildImagePrompt with a creative direction', () => {
  it('injects the art direction and drops the photoreal lock', () => {
    const dir = getDirection('bold-graphic')!;
    const prompt = buildImagePrompt({ brief: BRIEF, platform: 'instagram', copy: COPY, creativeDirection: dir.id });
    expect(prompt).toContain(`ART DIRECTION — ${dir.label}`);
    expect(prompt).toContain(dir.art);
    expect(prompt).not.toContain('Photorealistic, ultra-detailed');
  });

  it('keeps the photoreal default when no direction is set', () => {
    const prompt = buildImagePrompt({ brief: BRIEF, platform: 'instagram', copy: COPY });
    expect(prompt).toContain('Photorealistic, ultra-detailed');
    expect(prompt).not.toContain('ART DIRECTION —');
  });

  it('always keeps the overlay-safe constraints', () => {
    const prompt = buildImagePrompt({ brief: BRIEF, platform: 'instagram', copy: COPY, creativeDirection: 'cgi-3d' });
    expect(prompt).toContain('DO NOT include ANY text');
    expect(prompt).toContain('bottom 25%');
  });
});
