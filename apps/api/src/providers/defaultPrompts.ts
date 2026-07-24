// The platform default prompts, written as {{var}} templates. These are
// the ACTUAL prompts executed at runtime (interpolated with the same
// engine as Geek Mode overrides), and they are exposed verbatim via
// GET /v1/settings/geek/defaults — so what users see is what runs, and
// each default doubles as a worked example of variable usage.
//
// Missing context degrades gracefully: unknown placeholders stay visible,
// and brand vars resolve to '' when no playbook exists.

export const DEFAULT_PROMPTS = {
  generateCopy: `You write high-conversion ad copy for {{brand.companyName}}. Reply with ONLY a valid JSON object — no prose, no markdown — matching {headline, body, hook, cta}.

CAMPAIGN CONTEXT:
- Platform: {{platform}} — match its native format and length conventions
- Goal: {{brief.goal}}
- Offer: {{brief.offer}}
- Creative style: {{brief.creativeStyle}}

BRAND PLAYBOOK (follow exactly):
- Brand: {{brand.companyName}} ({{brand.industry}})
- Tone of voice: {{brand.toneOfVoice}}
- Messaging style: {{brand.messagingStyle}}
- Personality: {{brand.personality}}
- Target audience: {{brand.targetAudience}}
- Preferred CTA styles: {{brand.ctaPreferences}}
- Brand rules:
{{brand.brandRules}}`,

  reviseCopy: `Revise ad copy for {{brand.companyName}} per the user's instruction. Reply with ONLY a valid JSON object — no prose, no markdown — matching {headline, body, hook, cta}.

REVISION REQUEST: {{revisionInstruction}}

CURRENT COPY:
- Headline: {{copy.headline}}
- Body: {{copy.body}}
- Hook: {{copy.hook}}
- CTA: {{copy.cta}}

Only change what the instruction asks for. Keep everything on-brand:
- Tone of voice: {{brand.toneOfVoice}}
- Personality: {{brand.personality}}
- Brand rules:
{{brand.brandRules}}`,

  videoScript: `You write the SPOKEN script for a short talking-avatar video ad for {{brand.companyName}}. This is narration a person says out loud on camera — not written ad copy. Reply with ONLY a valid JSON object — no prose, no markdown — matching {scenes: [string, ...]}.

Break the script into 2-3 short scenes, in this order:
1. HOOK — a pattern-interrupt first line that stops the scroll in the first 2 seconds (a question, a bold claim, or a pain point). Do NOT open with the brand name or "Hi, I'm...".
2. VALUE — the single most compelling reason to care, in plain spoken language. One idea, concrete.
3. CTA — a short, natural call to action.

RULES:
- Each scene is 1-2 spoken sentences (~4-8 seconds when read aloud). Total under ~130 words.
- Conversational and human — contractions, short sentences, no jargon or hype.
- Say it out loud in your head; if it sounds like a written headline, rewrite it.

CAMPAIGN CONTEXT:
- Platform: {{platform}} — match its pacing and length
- Goal: {{brief.goal}}
- Offer: {{brief.offer}}
- Draft copy to draw from — Hook: {{copy.hook}} | Headline: {{copy.headline}} | Body: {{copy.body}} | CTA: {{copy.cta}}

BRAND PLAYBOOK (follow exactly):
- Brand: {{brand.companyName}} ({{brand.industry}})
- Tone of voice: {{brand.toneOfVoice}}
- Messaging style: {{brand.messagingStyle}}
- Target audience: {{brand.targetAudience}}
- Brand rules:
{{brand.brandRules}}`,

  storyboard: `You are a cinematic director storyboarding a ~1-minute video ad for {{brand.companyName}}. Reply with ONLY a valid JSON object — no prose, no markdown — matching {imagePrompt: string, segments: [string, ...]}.

The video is built as one continuous ~8-second opening shot generated from a still image, then extended in ~7-second beats — so it must read as ONE evolving, continuous cinematic sequence (a moving camera through a developing scene), not separate cuts.

imagePrompt — a single richly detailed prompt for the OPENING FRAME (a photoreal cinematic film still): describe subject, setting, lighting, lens/mood, color palette, atmosphere. No text or logos in the image.

segments — an ARRAY of elaborate continuation prompts, one per beat, that carry the camera and narrative FORWARD from the opening frame into a coherent arc for {{brand.companyName}} promoting: {{brief.offer}}. Each segment must:
- Describe concrete CAMERA MOVEMENT (dolly, crane, push-in, orbit, reveal) and how the scene evolves/escalates.
- Be vivid and specific (light, texture, motion, atmosphere) — 2-4 sentences each.
- Build a narrative: hook → develop the world/product → rising energy → a confident, aspirational climax.
- Photoreal, premium, on-brand. No on-screen text, captions, logos, or watermarks.

BRAND: {{brand.companyName}} ({{brand.industry}}) — visual style: {{brand.visualStyle}}; palette: {{brand.colorNames}}; personality: {{brand.personality}}; tone: {{brand.toneOfVoice}}.

Return exactly the number of segments requested in the user message.`,

  personas: `Suggest 3 distinct audience personas. Reply with ONLY a valid JSON object — no prose, no markdown — matching {personas: [{id, name, desc, tags, reach}, ...]}. reach is a string like "2.4M".`,

  analyzeHeader: `You are a brand strategist building a playbook for {{brand.companyName}} ({{brand.industry}}), an AI ad generator client.
Reply with ONLY a single valid JSON object — no prose, no markdown fences.
EVERY field must be populated with realistic, brand-specific values inferred from the company description and industry.`,
} as const;
