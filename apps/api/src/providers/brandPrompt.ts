// Builds a strongly-structured text-to-image prompt for FLUX 2 Pro.
//
// The prompt is organised into labelled sections so the model treats it as
// a creative brief rather than free-form chat. Hex colours are listed with
// role hints so FLUX uses them as the dominant palette. We explicitly tell
// it NOT to draw any text or logos — those are composited on top of the
// generated background by the worker so they appear pristine and on-brand.

import type { Brief, Platform } from '@megadon/types';
import type { CopyResult, BrandContext } from './types.js';
import { getDirection } from './creativeDirections.js';

interface BuildImagePromptInput {
  brief: Brief;
  platform: Platform;
  copy: CopyResult;
  brand?: BrandContext | null;
  /** When set, this is a revision — appended at the end without losing brand. */
  revisionInstruction?: string;
  /** Creative-direction id — drives the art direction for batch variety. */
  creativeDirection?: string | null;
}

export function buildImagePrompt(input: BuildImagePromptInput): string {
  const { brief, platform, copy, brand, revisionInstruction } = input;

  const a = brand?.analysis;
  const palette = a?.colors ?? [];
  const personality = a?.personality ?? [];
  const visualStyle = a?.visualStyle || brief.creativeStyle;
  const styles = a?.creativeStyles ?? [];
  const rules = a?.brandRules ?? [];
  const tones = brief.tones?.length ? brief.tones.join(', ') : 'professional';
  const direction = getDirection(input.creativeDirection);

  const sections: string[] = [];

  sections.push(
    `Create a high-quality ${platform} ad creative background${
      brand?.info?.companyName ? ` for ${brand.info.companyName}` : ''
    }${brand?.info?.industry ? ` (${brand.info.industry})` : ''}.`,
  );

  if (brand?.info?.companyName || personality.length || visualStyle) {
    sections.push(
      [
        'BRAND IDENTITY:',
        brand?.info?.companyName && `- Brand: ${brand.info.companyName}`,
        brand?.info?.industry && `- Industry: ${brand.info.industry}`,
        personality.length && `- Personality: ${personality.join(', ')}`,
        visualStyle && `- Visual style: ${visualStyle}`,
        tones && `- Tone: ${tones}`,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  if (palette.length > 0) {
    const colourLines = palette.slice(0, 5).map((c) => {
      const role = c.role ? ` — ${c.role}` : '';
      return `- ${c.hex} (${c.name}${role})`;
    });
    sections.push(
      [
        'COLOR PALETTE (use these exact hex colours as the dominant palette of the image):',
        ...colourLines,
        'The lighting, materials, environment and any props must reflect this palette. Avoid colours outside this palette.',
      ].join('\n'),
    );
  }

  if (styles.length > 0) {
    sections.push(
      ['CREATIVE STYLE REFERENCES:', ...styles.slice(0, 5).map((s) => `- ${s}`)].join('\n'),
    );
  }

  // Creative direction drives the art direction so each ad in a batch is a
  // distinct concept rather than the same photoreal formula.
  if (direction) {
    sections.push(`ART DIRECTION — ${direction.label}:\n- ${direction.art}`);
  }

  sections.push(
    [
      'SCENE / SUBJECT:',
      `- The ad promotes: ${brief.offer}`,
      `- Hook concept: ${copy.hook}`,
      `- Target audience: ${
        a?.targetAudience ??
        brief.audience.selectedPersona?.desc ??
        brief.audience.interests.join(', ')
      }`,
      direction
        ? '- Mood: commit fully to the ART DIRECTION above, on-brand'
        : '- Mood: aspirational, premium, on-brand',
      '- Composition: place the main subject in the upper two-thirds. Reserve the bottom 25% as clean, low-contrast negative space — the headline, CTA button and brand logo will be composited on top of that area, so do NOT clutter it with detail.',
    ].join('\n'),
  );

  sections.push(
    [
      'QUALITY:',
      // Only lock photoreal when no direction is chosen — some directions
      // (bold graphic, 3D render) are deliberately not photorealistic.
      direction
        ? '- Render the ART DIRECTION with impeccable craft and finish'
        : '- Photorealistic, ultra-detailed, tack-sharp focus',
      '- Professional commercial advertising aesthetic',
      '- Cinematic lighting, premium production value, shallow depth of field where appropriate',
      '- 4K, crisp edges, vivid but balanced colour',
    ].join('\n'),
  );

  sections.push(
    [
      'STRICT CONSTRAINTS (the worker will composite text and logo on top, so):',
      '- DO NOT include ANY text, letters, words, numbers or typography in the image',
      '- DO NOT include logos, brand marks, wordmarks, slogans or signage',
      '- DO NOT include watermarks, signatures, captions or labels',
      '- Keep the bottom 25% of the image visually quiet (uniform tone or smooth gradient) — this is reserved for overlays',
    ].join('\n'),
  );

  if (rules.length > 0) {
    sections.push(
      ['BRAND RULES (must follow):', ...rules.slice(0, 6).map((r) => `- ${r}`)].join('\n'),
    );
  }

  if (revisionInstruction) {
    sections.push(
      [
        'USER REVISION REQUEST (apply this change while keeping all BRAND IDENTITY, COLOR PALETTE, and STRICT CONSTRAINTS above intact):',
        `- ${revisionInstruction}`,
      ].join('\n'),
    );
  }

  return sections.join('\n\n');
}

/**
 * Prompt for a text-native model (e.g. nano-banana-2) that designs the WHOLE
 * ad — integrated headline + CTA typography, layout and brand marks — so no
 * compositing is needed. The opposite of buildImagePrompt's "draw no text".
 */
export function buildDesignedAdPrompt(input: BuildImagePromptInput): string {
  const { brief, platform, copy, brand, revisionInstruction } = input;
  const a = brand?.analysis;
  const palette = a?.colors ?? [];
  const personality = a?.personality ?? [];
  const visualStyle = a?.visualStyle || brief.creativeStyle;
  const tones = brief.tones?.length ? brief.tones.join(', ') : 'professional';
  const direction = getDirection(input.creativeDirection);
  const company = brand?.info?.companyName;

  const sections: string[] = [];

  sections.push(
    `Design a complete, ready-to-publish ${platform} ad — a finished graphic with fully integrated typography and layout${
      company ? ` for ${company}` : ''
    }${brand?.info?.industry ? ` (${brand.info.industry})` : ''}. This is the final ad, not a background.`,
  );

  if (company || personality.length || visualStyle) {
    sections.push(
      [
        'BRAND IDENTITY:',
        company && `- Brand: ${company}`,
        brand?.info?.industry && `- Industry: ${brand.info.industry}`,
        personality.length && `- Personality: ${personality.join(', ')}`,
        visualStyle && `- Visual style: ${visualStyle}`,
        tones && `- Tone: ${tones}`,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  if (palette.length > 0) {
    const colourLines = palette.slice(0, 5).map((c) => `- ${c.hex} (${c.name}${c.role ? ` — ${c.role}` : ''})`);
    sections.push(
      ['COLOR PALETTE (use these exact hex colours for backgrounds, type and the CTA):', ...colourLines].join('\n'),
    );
  }

  if (direction) {
    sections.push(`ART DIRECTION — ${direction.label}:\n- ${direction.art}`);
  }

  // The exact on-image copy — spelled precisely.
  sections.push(
    [
      'ON-IMAGE COPY (render this text EXACTLY, spelled correctly, no other words):',
      copy.headline && `- HEADLINE (largest, most prominent): "${copy.headline.trim()}"`,
      copy.cta && `- CTA BUTTON (a clear pill/button): "${copy.cta.trim()}"`,
      company && `- BRAND WORDMARK (small, tasteful): "${company}"`,
      `- The ad promotes: ${brief.offer}`,
    ]
      .filter(Boolean)
      .join('\n'),
  );

  sections.push(
    [
      'LAYOUT & QUALITY:',
      '- Professional graphic-design composition with clear visual hierarchy: headline dominant, supporting visual, CTA button obvious.',
      '- Crisp, correctly-spelled, beautifully kerned typography. No lorem ipsum, no gibberish text, no repeated/duplicate words.',
      '- Balanced negative space; premium advertising finish; sharp at 2K.',
      '- Colours strictly from the palette above.',
    ].join('\n'),
  );

  sections.push(
    [
      'STRICT CONSTRAINTS:',
      '- Render ONLY the copy specified above — do not invent extra text, labels, prices or URLs.',
      '- No watermarks, no signatures, no stock-photo overlays.',
      '- Do not misspell the brand name or headline.',
    ].join('\n'),
  );

  if (revisionInstruction) {
    sections.push(`USER REVISION REQUEST (apply while keeping brand + palette + exact copy intact):\n- ${revisionInstruction}`);
  }

  return sections.join('\n\n');
}
