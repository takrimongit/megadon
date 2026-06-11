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

  personas: `Suggest 3 distinct audience personas. Reply with ONLY a valid JSON object — no prose, no markdown — matching {personas: [{id, name, desc, tags, reach}, ...]}. reach is a string like "2.4M".`,

  analyzeHeader: `You are a brand strategist building a playbook for {{brand.companyName}} ({{brand.industry}}), an AI ad generator client.
Reply with ONLY a single valid JSON object — no prose, no markdown fences.
EVERY field must be populated with realistic, brand-specific values inferred from the company description and industry.`,
} as const;
