// Creative directions — distinct ad art-direction archetypes.
//
// Every ad in a batch used to run the same "photorealistic premium" formula,
// so a batch of N ads was N flavours of one look. Distributing a different
// creative direction across each slot makes a batch actually explore ideas.
//
// Each direction is injected as an ART DIRECTION block into the image prompt
// (replacing the fixed photoreal mood) and contributes a MOTION cue to the
// video prompt. Directions describe the *scene aesthetic* only — text, logo
// and CTA are still composited on top, so none of them ask for typography.

export interface CreativeDirection {
  id: string;
  label: string;
  /** Art-direction paragraph for the still-image prompt. */
  art: string;
  /** Motion cue appended for video (Veo) prompts. */
  motion: string;
}

export const CREATIVE_DIRECTIONS: CreativeDirection[] = [
  {
    id: 'hero-macro',
    label: 'Hero Macro',
    art: 'Extreme close-up macro of the hero subject — tactile surface detail, dramatic studio lighting, shallow depth of field, glints and highlights. Photoreal, product-photography grade.',
    motion: 'Slow macro push-in with a rack focus that reveals surface detail.',
  },
  {
    id: 'lifestyle-candid',
    label: 'Lifestyle Candid',
    art: 'Authentic lifestyle moment — a real person using or reacting to the offer in a believable everyday setting. Natural window light, documentary candid framing, genuine expression, unposed.',
    motion: 'Handheld candid drift, natural light, a small genuine gesture.',
  },
  {
    id: 'bold-graphic',
    label: 'Bold Graphic',
    art: 'Bold graphic-poster aesthetic — large flat fields of the brand colours, oversized geometric shapes, Swiss/Bauhaus composition, high contrast, confident negative space, screen-print flatness. Not photoreal.',
    motion: 'Hard graphic shapes sliding and snapping into a bold composition.',
  },
  {
    id: 'surreal-concept',
    label: 'Surreal Concept',
    art: 'Surreal conceptual editorial — one striking visual metaphor for the offer, unexpected juxtaposition, dreamlike scale, clean soft shadows, gallery-editorial polish. Imaginative and memorable.',
    motion: 'A surreal element defies gravity in one slow, dreamlike beat.',
  },
  {
    id: 'cgi-3d',
    label: '3D Render',
    art: 'Glossy 3D CGI render — soft studio gradient backdrop, floating abstract forms and soft-body materials, subsurface scattering, tasteful specular highlights, Octane/Redshift finish. Premium and modern.',
    motion: 'Weightless 3D forms rotating and settling with soft studio light.',
  },
  {
    id: 'editorial-minimal',
    label: 'Editorial Minimal',
    art: 'Editorial minimalism — vast calm negative space, a single small hero subject off-centre, muted restrained palette drawn from the brand colours, magazine-grade sophistication and air.',
    motion: 'A near-still, slow parallax across wide minimal negative space.',
  },
  {
    id: 'dynamic-motion',
    label: 'Dynamic Motion',
    art: 'High-energy motion — a strong sense of speed and momentum, directional motion blur and light streaks, dynamic diagonal composition, kinetic and bold. Energetic commercial spot.',
    motion: 'Fast whip-pan with motion-blur streaks resolving on a beauty frame.',
  },
  {
    id: 'organic-natural',
    label: 'Organic Natural',
    art: 'Organic and natural — tactile natural textures (paper, stone, foliage, fabric), warm golden sunlight, earthy grounded palette tuned to the brand colours, calm and human.',
    motion: 'Warm sunlight shifting across natural textures, gentle breeze.',
  },
];

const BY_ID = new Map(CREATIVE_DIRECTIONS.map((d) => [d.id, d]));

/** Deterministically pick a direction for a batch slot; offset varies it per batch. */
export function pickDirection(index: number, offset = 0): CreativeDirection {
  const n = CREATIVE_DIRECTIONS.length;
  return CREATIVE_DIRECTIONS[((index + offset) % n + n) % n]!;
}

export function getDirection(id?: string | null): CreativeDirection | undefined {
  return id ? BY_ID.get(id) : undefined;
}

/** Random starting offset so two batches with the same size still differ. */
export function randomDirectionOffset(): number {
  return Math.floor(Math.random() * CREATIVE_DIRECTIONS.length);
}
