// Pure unit tests — no emulator required, but they run inside the same
// suite so CI covers them on every push.

import { describe, it, expect } from 'vitest';
import {
  interpolate,
  interpolateWithContext,
  interpolateSystemPrompt,
} from '../src/providers/interpolate.js';
import { DEFAULT_PROMPTS } from '../src/providers/defaultPrompts.js';
import type { Brief } from '@megadon/types';
import type { BrandContext } from '../src/providers/types.js';

const BRIEF: Brief = {
  goal: 'conversion',
  audience: { ageGroups: ['25-34'], interests: ['Fitness'], personaDescription: 'Urban runners' },
  offer: '20% off annual plans',
  platforms: ['instagram'],
  batchSize: 4,
  creativeStyle: 'bold',
  tones: ['Confident'],
  mediaType: 'image',
};

const BRAND: BrandContext = {
  info: { companyName: 'Acme', websiteUrl: 'https://acme.test', industry: 'Tech', description: 'Dev tools for teams.' },
  analysis: {
    colors: [{ hex: '#112233', name: 'Navy', role: 'primary' }],
    personality: ['Bold', 'Trustworthy'],
    toneOfVoice: 'Direct and warm',
    visualStyle: 'High-contrast photography',
    targetAudience: 'Engineers',
    creativeStyles: ['Minimalist'],
    brandRules: ['No stock smiles'],
    messagingStyle: 'Outcome-first',
    ctaPreferences: ['Start free'],
    confidence: { colors: 1, personality: 1, toneOfVoice: 1, visualStyle: 1, audience: 1 },
  },
};

describe('interpolate', () => {
  it('replaces known vars and keeps unknown placeholders intact', () => {
    const out = interpolate('Hello {{name}}, missing {{nope}}', { name: 'World' });
    expect(out).toBe('Hello World, missing {{nope}}');
  });

  it('interpolateWithContext resolves brief, platform, copy and brand vars', () => {
    const out = interpolateWithContext(
      'P={{platform}} O={{brief.offer}} H={{copy.headline}} C={{brand.companyName}} HEX={{brand.colorHexes}}',
      {
        brief: BRIEF,
        platform: 'instagram',
        copy: { headline: 'Run Faster', body: 'b', hook: 'h', cta: 'Go' },
        brand: BRAND,
      },
    );
    expect(out).toBe('P=instagram O=20% off annual plans H=Run Faster C=Acme HEX=#112233');
  });
});

describe('interpolateSystemPrompt (geek chat overrides)', () => {
  it('resolves vars available in a generateCopy context', () => {
    const out = interpolateSystemPrompt(
      'Write for {{brand.companyName}} on {{platform}}. Tone: {{brand.toneOfVoice}}. Offer: {{brief.offer}}',
      { brief: BRIEF, platform: 'tiktok', brand: BRAND },
    );
    expect(out).toBe('Write for Acme on tiktok. Tone: Direct and warm. Offer: 20% off annual plans');
  });

  it('resolves revision instruction + current copy in a reviseCopy context', () => {
    const out = interpolateSystemPrompt(
      'Revise per: {{revisionInstruction}}. Current headline: {{copy.headline}}',
      {
        brief: BRIEF,
        brand: BRAND,
        copy: { headline: 'Old Headline', body: 'b', hook: 'h', cta: 'c' },
        revisionInstruction: 'make it punchier',
      },
    );
    expect(out).toBe('Revise per: make it punchier. Current headline: Old Headline');
  });

  it('tolerates missing context blocks (personas has no brief/brand)', () => {
    const out = interpolateSystemPrompt('Brand: {{brand.companyName}} static text', {});
    expect(out).toBe('Brand: {{brand.companyName}} static text');
  });

  it('the DEFAULT generateCopy template actually uses the runtime variables', () => {
    const out = interpolateSystemPrompt(DEFAULT_PROMPTS.generateCopy, {
      brief: BRIEF, platform: 'instagram', brand: BRAND,
    });
    expect(out).toContain('ad copy for Acme');
    expect(out).toContain('Platform: instagram');
    expect(out).toContain('Offer: 20% off annual plans');
    expect(out).toContain('Tone of voice: Direct and warm');
    expect(out).toContain('- No stock smiles');
    expect(out).not.toContain('{{'); // every placeholder resolved
  });

  it('the DEFAULT reviseCopy template injects instruction + current copy', () => {
    const out = interpolateSystemPrompt(DEFAULT_PROMPTS.reviseCopy, {
      brief: BRIEF, brand: BRAND,
      copy: { headline: 'Old H', body: 'Old B', hook: 'Old K', cta: 'Old C' },
      revisionInstruction: 'shorter and punchier',
    });
    expect(out).toContain('REVISION REQUEST: shorter and punchier');
    expect(out).toContain('Headline: Old H');
    expect(out).not.toContain('{{');
  });

  it('null-guards missing analysis (brand analyze runs before analysis exists)', () => {
    const out = interpolateSystemPrompt(
      'Co: {{brand.companyName}} Colors: {{brand.colorHexes}}',
      { brand: { info: BRAND.info } as BrandContext },
    );
    expect(out).toBe('Co: Acme Colors: ');
  });
});
