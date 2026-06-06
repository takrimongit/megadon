import OpenAI from 'openai';
import { z } from 'zod';
import { config } from '../lib/config.js';
import { AppError } from '../lib/errors.js';
import type { CopyProvider, CopyResult } from './types.js';
import type { Brief, Persona, Platform } from '@megadon/types';

// kie.ai exposes OpenAI-compatible chat completions PER MODEL at
// https://api.kie.ai/{model}/v1/chat/completions. The OpenAI SDK is fine —
// we just set baseURL to include the model prefix.
const client = new OpenAI({
  apiKey: config.kieKey,
  baseURL: `https://api.kie.ai/${config.kieChatModel}/v1`,
});

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

/**
 * Strip ```json fences a model might wrap structured output in.
 */
function unwrapJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  return fenced ? fenced[1] : raw;
}

async function callJson<T>(schema: z.ZodSchema<T>, system: string, user: string): Promise<T> {
  if (!config.kieKey) throw AppError.provider('KIE_API_KEY not set');
  try {
    const resp = await client.chat.completions.create({
      model: config.kieChatModel,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      // Not every kie.ai-hosted model supports response_format. Ask for
      // JSON in the prompt and parse defensively instead.
    });
    const raw = resp.choices[0]?.message?.content ?? '{}';
    return schema.parse(JSON.parse(unwrapJson(raw)));
  } catch (e) {
    throw AppError.provider(`kie.ai chat (${config.kieChatModel}): ${(e as Error).message}`);
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
