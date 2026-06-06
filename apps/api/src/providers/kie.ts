import { z } from 'zod';
import { config } from '../lib/config.js';
import { AppError } from '../lib/errors.js';
import type { CopyProvider, CopyResult } from './types.js';
import type { Brief, Persona, Platform } from '@megadon/types';

// kie.ai chat completions are per-model: POST to
// https://api.kie.ai/{model}/v1/chat/completions with an OpenAI-shaped
// payload. Plain fetch — the OpenAI SDK adds telemetry headers that
// kie.ai's WAF appears to block.

const CopySchema = z.object({
  headline: z.string(),
  body: z.string(),
  hook: z.string(),
  cta: z.string(),
});

const PersonasSchema = z.object({
  personas: z.array(z.object({
    id: z.string(),
    name: z.string(),
    desc: z.string(),
    tags: z.array(z.string()),
    reach: z.string(),
  })).length(3),
});

interface ChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  msg?: string;
}

/** Strip ```json fences a model might wrap structured output in. */
function unwrapJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  return fenced ? fenced[1] : raw;
}

async function callJson<T>(schema: z.ZodSchema<T>, system: string, user: string): Promise<T> {
  if (!config.kieKey) throw AppError.provider('KIE_API_KEY not set');
  const url = `https://api.kie.ai/${config.kieChatModel}/v1/chat/completions`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.kieKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.kieChatModel,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!resp.ok) {
    throw AppError.provider(`kie.ai chat ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  }
  const json = await resp.json() as ChatResponse;
  const raw = json.choices?.[0]?.message?.content;
  if (!raw) {
    throw AppError.provider(`kie.ai chat: empty content (${json.msg ?? 'unknown'})`);
  }
  try {
    return schema.parse(JSON.parse(unwrapJson(raw)));
  } catch (e) {
    throw AppError.provider(`kie.ai chat: malformed JSON — ${(e as Error).message}`);
  }
}

export const kieProvider: CopyProvider = {
  async generateCopy(brief: Brief, platform: Platform): Promise<CopyResult> {
    const system = `You write high-conversion ad copy. Reply with ONLY a valid JSON object — no prose, no markdown — matching {headline, body, hook, cta}. Match the platform's format.`;
    const user = `Platform: ${platform}\nGoal: ${brief.goal}\nOffer: ${brief.offer}\nStyle: ${brief.creativeStyle}\nTone: ${brief.tones.join(', ')}\nAudience: ${brief.audience.selectedPersona?.name ?? brief.audience.personaDescription ?? brief.audience.interests.join(', ')}`;
    return callJson(CopySchema, system, user);
  },

  async reviseCopy(current, instruction, brief) {
    const system = `Revise ad copy per the user's instruction. Reply with ONLY a valid JSON object — no prose, no markdown — matching {headline, body, hook, cta}.`;
    const user = `Current: ${JSON.stringify(current)}\nInstruction: ${instruction}\nBrief offer: ${brief.offer}\nStyle: ${brief.creativeStyle}`;
    return callJson(CopySchema, system, user);
  },

  async suggestPersonas(input): Promise<Persona[]> {
    const system = `Suggest 3 distinct audience personas. Reply with ONLY a valid JSON object — no prose, no markdown — matching {personas: [{id, name, desc, tags, reach}, ...]}. reach is a string like "2.4M".`;
    const user = `Age groups: ${input.ageGroups.join(', ')}\nInterests: ${input.interests.join(', ')}\nDescription: ${input.personaDescription ?? '(none)'}`;
    const out = await callJson(PersonasSchema, system, user);
    return out.personas;
  },
};
