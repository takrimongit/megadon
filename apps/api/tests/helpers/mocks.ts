import { vi } from 'vitest';
import type { CopyResult } from '../../src/providers/types.js';
import type { Persona } from '@megadon/types';

// Reusable fake copy + persona payloads.
export const fakeCopy: CopyResult = {
  headline: 'Test Headline',
  body: 'Test body copy.',
  hook: 'Catchy hook',
  cta: 'Shop Now',
};

export const fakePersonas: Persona[] = [
  { id: 'p1', name: 'Trendsetter', desc: 'Early adopters', tags: ['ig'], reach: '2M' },
  { id: 'p2', name: 'Pragmatist', desc: 'Value buyers', tags: ['fb'], reach: '3M' },
  { id: 'p3', name: 'Professional', desc: 'Career-focused', tags: ['li'], reach: '1.5M' },
];

export function mockCopyProvider() {
  vi.mock('../../src/providers/kie.js', () => ({
    kieProvider: {
      generateCopy: vi.fn().mockResolvedValue(fakeCopy),
      reviseCopy: vi.fn().mockResolvedValue({ ...fakeCopy, headline: 'Revised Headline' }),
      suggestPersonas: vi.fn().mockResolvedValue(fakePersonas),
    },
  }));
}
