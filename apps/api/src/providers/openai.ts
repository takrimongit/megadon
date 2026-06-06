import OpenAI from 'openai';
import { z } from 'zod';
import { config } from '../lib/config.js';
import { AppError } from '../lib/errors.js';
import type { CopyProvider, CopyResult } from './types.js';
import type { Brief, Persona, Platform } from '@megadon/types';

const client = new OpenAI({ apiKey: config.openaiKey });

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

const MODEL = 'gpt-4o-mini';

async function callJson<T>(schema: z.ZodSchema<T>, system: string, user: string): Promise<T> {
  if (!config.openaiKey) throw AppError.provider('OPENAI_API_KEY not set');
  try {
    const resp = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });
    const raw = resp.choices[0]?.message?.content ?? '{}';
    return schema.parse(JSON.parse(raw));
  } catch (e) {
    throw AppError.provider(`OpenAI: ${(e as Error).message}`);
  }
}

export const openaiProvider: CopyProvider = {
  async generateCopy(brief: Brief, platform: Platform): Promise<CopyResult> {
    const system = `You write high-conversion ad copy. Return JSON: {headline, body, hook, cta}. Match the platform format.`;
    const user = `Platform: ${platform}\nGoal: ${brief.goal}\nOffer: ${brief.offer}\nStyle: ${brief.creativeStyle}\nTone: ${brief.tones.join(', ')}\nAudience: ${brief.audience.selectedPersona?.name ?? brief.audience.personaDescription ?? brief.audience.interests.join(', ')}`;
    return callJson(CopySchema, system, user);
  },

  async reviseCopy(current, instruction, brief) {
    const system = `Revise ad copy per the user's instruction. Return JSON: {headline, body, hook, cta}.`;
    const user = `Current: ${JSON.stringify(current)}\nInstruction: ${instruction}\nBrief offer: ${brief.offer}\nStyle: ${brief.creativeStyle}`;
    return callJson(CopySchema, system, user);
  },

  async suggestPersonas(input): Promise<Persona[]> {
    const system = `Suggest 3 distinct audience personas. Return JSON {personas: [{id, name, desc, tags, reach}, ...]}. reach is a string like "2.4M".`;
    const user = `Age groups: ${input.ageGroups.join(', ')}\nInterests: ${input.interests.join(', ')}\nDescription: ${input.personaDescription ?? '(none)'}`;
    const out = await callJson(PersonasSchema, system, user);
    return out.personas;
  },
};
