import { z } from 'zod';
import { config } from '../lib/config.js';
import { AppError } from '../lib/errors.js';
import { interpolateSystemPrompt, type InterpolationContext } from './interpolate.js';
import { DEFAULT_PROMPTS } from './defaultPrompts.js';
import type { CopyProvider, CopyResult, BrandContext } from './types.js';
import type { Brief, Persona, Platform, GeekChatOverride } from '@megadon/types';

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

const ScriptSchema = z.object({
  scenes: z.array(z.string()).min(1).max(4),
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

async function callJson<T>(
  schema: z.ZodSchema<T>,
  system: string,
  user: string,
  modelOverride?: string,
): Promise<T> {
  if (!config.kieKey) throw AppError.provider('KIE_API_KEY not set');
  const model = modelOverride && modelOverride.trim() ? modelOverride.trim() : config.kieChatModel;
  const url = `https://api.kie.ai/${model}/v1/chat/completions`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.kieKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!resp.ok) {
    throw AppError.provider(`kie.ai chat (${model}) ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  }
  const json = await resp.json() as ChatResponse;
  const raw = json.choices?.[0]?.message?.content;
  if (!raw) {
    throw AppError.provider(`kie.ai chat (${model}): empty content (${json.msg ?? 'unknown'})`);
  }
  try {
    return schema.parse(JSON.parse(unwrapJson(raw)));
  } catch (e) {
    throw AppError.provider(`kie.ai chat: malformed JSON — ${(e as Error).message}`);
  }
}

/**
 * Resolve the system prompt. Both the override AND the platform default
 * are {{var}} templates interpolated against the runtime context — the
 * default shown in Geek Mode is exactly the prompt that executes.
 */
function pickSystem(
  override: { systemPrompt?: string } | null | undefined,
  defaultTemplate: string,
  ctx: Partial<InterpolationContext> = {},
): string {
  const template = override?.systemPrompt && override.systemPrompt.trim().length > 0
    ? override.systemPrompt
    : defaultTemplate;
  return interpolateSystemPrompt(template, ctx);
}

export const kieProvider: CopyProvider = {
  async generateCopy(brief, platform, brand, override) {
    const system = pickSystem(override, DEFAULT_PROMPTS.generateCopy, { brief, platform, brand });
    const user = `Platform: ${platform}\nGoal: ${brief.goal}\nOffer: ${brief.offer}\nStyle: ${brief.creativeStyle}\nTone: ${brief.tones.join(', ')}\nAudience: ${brief.audience.selectedPersona?.name ?? brief.audience.personaDescription ?? brief.audience.interests.join(', ')}`;
    return callJson(CopySchema, system, user, override?.model);
  },

  async reviseCopy(current, instruction, brief, brand, override) {
    const system = pickSystem(override, DEFAULT_PROMPTS.reviseCopy, {
      brief, brand, copy: current, revisionInstruction: instruction,
    });
    const user = `Current: ${JSON.stringify(current)}\nInstruction: ${instruction}\nBrief offer: ${brief.offer}\nStyle: ${brief.creativeStyle}`;
    return callJson(CopySchema, system, user, override?.model);
  },

  async suggestPersonas(input, override) {
    const system = pickSystem(override, DEFAULT_PROMPTS.personas);
    const user = `Age groups: ${input.ageGroups.join(', ')}\nInterests: ${input.interests.join(', ')}\nDescription: ${input.personaDescription ?? '(none)'}`;
    const out = await callJson(PersonasSchema, system, user, override?.model);
    return out.personas;
  },
};

/**
 * Turn the ad copy + brand into a SPOKEN multi-scene script for a talking
 * avatar (hook → value → CTA). Kept off the CopyProvider interface because
 * it's specific to the avatar video path; heygen.ts calls it directly and
 * falls back to copy-derived scenes if the model call fails.
 */
export async function generateVideoScript(
  brief: Brief,
  platform: Platform,
  brand?: BrandContext | null,
  copy?: CopyResult,
  override?: GeekChatOverride | null,
): Promise<string[]> {
  const system = pickSystem(override, DEFAULT_PROMPTS.videoScript, { brief, platform, brand, copy });
  const user = `Platform: ${platform}\nGoal: ${brief.goal}\nOffer: ${brief.offer}\nHook: ${copy?.hook ?? ''}\nHeadline: ${copy?.headline ?? ''}\nBody: ${copy?.body ?? ''}\nCTA: ${copy?.cta ?? ''}`;
  const out = await callJson(ScriptSchema, system, user, override?.model);
  return out.scenes.map((s) => s.trim()).filter((s) => s.length > 0);
}
