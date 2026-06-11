// Static defaults exposed to the Geek Mode screens so a user can see,
// copy, and enhance the prompts the platform ships with. The chat
// templates are imported from providers/defaultPrompts.ts — they are the
// literal templates executed at runtime (interpolated with the same
// engine as overrides), so what users see here is exactly what runs.

import type { GeekDefaults } from '@megadon/types';
import { getPricingTable } from './aiPricing.js';
import { DEFAULT_PROMPTS } from '../providers/defaultPrompts.js';

const CHAT_GENERATE = DEFAULT_PROMPTS.generateCopy;
const CHAT_REVISE = DEFAULT_PROMPTS.reviseCopy;
const CHAT_PERSONAS = DEFAULT_PROMPTS.personas;

const CHAT_ANALYZE = `${DEFAULT_PROMPTS.analyzeHeader}

Example output for a hypothetical premium running shoe brand:
{
  "colors": [
    {"hex": "#0F1B2D", "name": "Midnight Navy", "role": "primary"},
    {"hex": "#FF4D2E", "name": "Performance Orange", "role": "accent"},
    {"hex": "#F4F1EC", "name": "Soft Ivory", "role": "neutral"},
    {"hex": "#1B1B1B", "name": "Carbon", "role": "neutral"}
  ],
  "personality": ["Energetic", "Confident", "Authentic", "Bold"],
  "toneOfVoice": "Encouraging and direct. Speaks like a coach — concise sentences, action verbs, never preachy.",
  "visualStyle": "High-contrast lifestyle photography with motion blur, low camera angles, and bold sans-serif overlays.",
  "targetAudience": "Urban runners aged 25–40 who train 4+ times per week and value premium gear that lasts.",
  "creativeStyles": ["Motion-driven lifestyle", "Bold typography overlays", "High-contrast minimalism"],
  "brandRules": ["Always include a moving athlete in the frame", "Never use stock smiles", "Keep headlines under 7 words", "Always close with a measurable benefit"],
  "messagingStyle": "Outcome-first benefits — every ad ties a feature back to a measurable training improvement.",
  "ctaPreferences": ["Train Like a Pro", "Find Your Pace", "Join the Run Club"],
  "confidence": {"colors": 0.85, "personality": 0.9, "toneOfVoice": 0.88, "visualStyle": 0.82, "audience": 0.9}
}

Now produce the same structure — fully populated, no empty arrays, no echoing of the placeholder text — for the user's brand below.`;

const IMAGE_TEMPLATE = `Create a high-quality {{platform}} ad creative background for {{brand.companyName}} ({{brief.offer}}).

BRAND IDENTITY:
- Brand: {{brand.companyName}}
- Personality: {{brand.personality}}
- Visual style: {{brand.visualStyle}}
- Tone: {{brand.toneOfVoice}}

COLOR PALETTE (use these exact hex colours as the dominant palette):
{{brand.colorNames}}
The lighting, materials, environment and any props must reflect this palette. Avoid colours outside this palette.

CREATIVE STYLE REFERENCES:
{{brand.creativeStyles}}

SCENE / SUBJECT:
- The ad promotes: {{brief.offer}}
- Hook concept: {{copy.hook}}
- Target audience: {{brand.targetAudience}}
- Mood: aspirational, premium, on-brand
- Composition: place the main subject in the upper two-thirds. Reserve the bottom 25% as clean, low-contrast negative space — the headline, CTA button and brand logo will be composited on top.

QUALITY:
- Photorealistic, ultra-detailed, tack-sharp focus
- Professional commercial advertising aesthetic
- Cinematic lighting, premium production value, shallow depth of field where appropriate
- 4K, crisp edges, vivid but balanced colour

STRICT CONSTRAINTS (the worker will composite text and logo on top, so):
- DO NOT include ANY text, letters, words, numbers or typography in the image
- DO NOT include logos, brand marks, wordmarks, slogans or signage
- DO NOT include watermarks, signatures, captions or labels
- Keep the bottom 25% of the image visually quiet — this is reserved for overlays

BRAND RULES (must follow):
{{brand.brandRules}}

USER REVISION REQUEST (apply this change while keeping all BRAND IDENTITY, COLOR PALETTE, and STRICT CONSTRAINTS above intact):
- {{revisionInstruction}}`;

const VIDEO_TEMPLATE = `Create a cinematic 6-second {{platform}} ad video for {{brand.companyName}} ({{brief.offer}}).

BRAND IDENTITY:
- Brand: {{brand.companyName}}
- Personality: {{brand.personality}}
- Visual style: {{brand.visualStyle}}
- Tone: {{brand.toneOfVoice}}

COLOR PALETTE (dominant palette of every frame):
{{brand.colorNames}}

SCENE / SUBJECT:
- The ad promotes: {{brief.offer}}
- Hook concept: {{copy.hook}}
- Target audience: {{brand.targetAudience}}

STRICT CONSTRAINTS:
- Photorealistic, cinematic camera movement (subtle, no shaky motion)
- Keep typography and logos OUT of the video itself — they will be presented in the app UI alongside the video
- No watermarks or signatures
- Smooth, premium pacing

MOTION DIRECTION:
- Establish the scene in the first 2 seconds, then a subtle parallax/dolly move
- End on a stable beauty shot that holds the brand mood

BRAND RULES (must follow):
{{brand.brandRules}}`;

// Curated model menu. The user can also type any kie.ai model id by hand.
const CHAT_MODELS = ['gpt-5-2', 'gpt-4o', 'gemini-2.5-flash', 'claude-sonnet-4-6'];
const ANALYZE_MODELS = ['gemini-2.5-flash', 'gpt-5-2', 'claude-sonnet-4-6'];
const IMAGE_MODELS = ['flux-2/pro-text-to-image', 'flux-2/dev-text-to-image', 'stable-diffusion-3.5-large'];
const VIDEO_MODELS = ['veo3_lite', 'veo3', 'kling-1.6'];

const VARIABLES = {
  common: ['{{platform}}', '{{revisionInstruction}}'],
  brief: [
    '{{brief.offer}}', '{{brief.goal}}', '{{brief.creativeStyle}}',
    '{{brief.audience.personaDescription}}',
  ],
  copy: ['{{copy.headline}}', '{{copy.body}}', '{{copy.hook}}', '{{copy.cta}}'],
  brand: [
    '{{brand.companyName}}', '{{brand.colorHexes}}', '{{brand.colorNames}}',
    '{{brand.personality}}', '{{brand.toneOfVoice}}', '{{brand.visualStyle}}',
    '{{brand.targetAudience}}', '{{brand.creativeStyles}}', '{{brand.brandRules}}',
    '{{brand.industry}}', '{{brand.messagingStyle}}', '{{brand.ctaPreferences}}',
  ],
};

export function getGeekDefaults(): GeekDefaults {
  return {
    chat: { systemPrompt: CHAT_GENERATE, models: CHAT_MODELS, defaultModel: 'gpt-5-2' },
    revise: { systemPrompt: CHAT_REVISE, models: CHAT_MODELS, defaultModel: 'gpt-5-2' },
    personas: { systemPrompt: CHAT_PERSONAS, models: CHAT_MODELS, defaultModel: 'gpt-5-2' },
    analyze: { systemPrompt: CHAT_ANALYZE, models: ANALYZE_MODELS, defaultModel: 'gemini-2.5-flash' },
    image: { promptTemplate: IMAGE_TEMPLATE, models: IMAGE_MODELS, defaultModel: 'flux-2/pro-text-to-image' },
    video: { promptTemplate: VIDEO_TEMPLATE, models: VIDEO_MODELS, defaultModel: 'veo3_lite' },
    variables: VARIABLES,
    pricing: getPricingTable(),
  };
}
