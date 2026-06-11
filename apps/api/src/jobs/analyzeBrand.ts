import { db } from '../lib/firebase.js';
import { z } from 'zod';
import { config } from '../lib/config.js';
import { AppError } from '../lib/errors.js';
import { loadGeekSettings, pickChat } from '../lib/geekSettings.js';
import { interpolateSystemPrompt } from '../providers/interpolate.js';
import { recordUsage, resolveModel } from '../lib/usage.js';
import type { BrandPlaybook, BrandAnalysis } from '@megadon/types';

interface JobPayload {
  workspaceId: string;
}

const AnalysisSchema = z.object({
  colors: z.array(z.object({
    hex: z.string(),
    name: z.string(),
    role: z.string().optional(),
  })).default([]),
  personality: z.array(z.string()).default([]),
  toneOfVoice: z.string().default(''),
  visualStyle: z.string().default(''),
  targetAudience: z.string().default(''),
  creativeStyles: z.array(z.string()).default([]),
  brandRules: z.array(z.string()).default([]),
  messagingStyle: z.string().default(''),
  ctaPreferences: z.array(z.string()).default([]),
  confidence: z.object({
    colors: z.number().min(0).max(1).default(0.8),
    personality: z.number().min(0).max(1).default(0.8),
    toneOfVoice: z.number().min(0).max(1).default(0.8),
    visualStyle: z.number().min(0).max(1).default(0.8),
    audience: z.number().min(0).max(1).default(0.8),
  }).default({ colors: 0.8, personality: 0.8, toneOfVoice: 0.8, visualStyle: 0.8, audience: 0.8 }),
});

function unwrapJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  return fenced ? fenced[1] : raw;
}

// gpt-5-2 is a reasoning model that often spends all output tokens on
// reasoning and returns empty `content`. Gemini Flash is more reliable
// for elaborate structured-output prompts. Override via KIE_ANALYZE_MODEL.
const ANALYZE_MODEL = process.env.KIE_ANALYZE_MODEL ?? 'gemini-2.5-flash';

async function callKieJson<T>(
  schema: z.ZodSchema<T>,
  system: string,
  user: string,
  modelOverride?: string,
): Promise<T> {
  if (!config.kieKey) throw AppError.provider('KIE_API_KEY not set');
  const model = modelOverride && modelOverride.trim() ? modelOverride.trim() : ANALYZE_MODEL;
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
    throw AppError.provider(`kie.ai analysis (${model}) ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  }
  const json = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content;
  if (!raw) {
    throw AppError.provider(
      `kie.ai analysis (${model}) returned empty content: ${JSON.stringify(json).slice(0, 300)}`,
    );
  }
  try {
    return schema.parse(JSON.parse(unwrapJson(raw)));
  } catch (e) {
    throw AppError.provider(
      `kie.ai analysis parse failed: ${(e as Error).message} — raw: ${raw.slice(0, 300)}`,
    );
  }
}

export async function runAnalyzeBrand(payload: JobPayload) {
  const { workspaceId } = payload;
  const ref = db().doc(`workspaces/${workspaceId}/brandPlaybook/current`);
  const snap = await ref.get();
  if (!snap.exists) return;
  const data = snap.data() as BrandPlaybook;
  if (!data.info) {
    await ref.update({ status: 'failed', error: { code: 'NO_INFO', message: 'Brand info missing' } });
    return;
  }

  const assetCounts = data.assets.reduce<Record<string, number>>((acc, a) => {
    acc[a.type] = (acc[a.type] ?? 0) + 1;
    return acc;
  }, {});

  // Text-based analysis seeded from brand info + asset metadata.
  // Image-based vision analysis is a future enhancement.
  //
  // Models follow concrete examples more reliably than schema-as-template;
  // we show one filled-in example for a different industry so the model
  // understands "produce values like this for the user's brand".
  const geek = await loadGeekSettings(workspaceId);
  const analyzeOverride = pickChat(geek, 'analyze');

  const defaultSystem = [
    'You are a brand strategist building a playbook for an AI ad generator.',
    'Reply with ONLY a single valid JSON object — no prose, no markdown fences.',
    'EVERY field must be populated with realistic, brand-specific values inferred from the company description and industry.',
    '',
    'Example output for a hypothetical premium running shoe brand:',
    '{',
    '  "colors": [',
    '    {"hex": "#0F1B2D", "name": "Midnight Navy", "role": "primary"},',
    '    {"hex": "#FF4D2E", "name": "Performance Orange", "role": "accent"},',
    '    {"hex": "#F4F1EC", "name": "Soft Ivory", "role": "neutral"},',
    '    {"hex": "#1B1B1B", "name": "Carbon", "role": "neutral"}',
    '  ],',
    '  "personality": ["Energetic", "Confident", "Authentic", "Bold"],',
    '  "toneOfVoice": "Encouraging and direct. Speaks like a coach — concise sentences, action verbs, never preachy.",',
    '  "visualStyle": "High-contrast lifestyle photography with motion blur, low camera angles, and bold sans-serif overlays.",',
    '  "targetAudience": "Urban runners aged 25–40 who train 4+ times per week and value premium gear that lasts.",',
    '  "creativeStyles": ["Motion-driven lifestyle", "Bold typography overlays", "High-contrast minimalism"],',
    '  "brandRules": ["Always include a moving athlete in the frame", "Never use stock smiles", "Keep headlines under 7 words", "Always close with a measurable benefit"],',
    '  "messagingStyle": "Outcome-first benefits — every ad ties a feature back to a measurable training improvement.",',
    '  "ctaPreferences": ["Train Like a Pro", "Find Your Pace", "Join the Run Club"],',
    '  "confidence": {"colors": 0.85, "personality": 0.9, "toneOfVoice": 0.88, "visualStyle": 0.82, "audience": 0.9}',
    '}',
    '',
    'Now produce the same structure — fully populated, no empty arrays, no echoing of the placeholder text — for the user\'s brand below.',
  ].join('\n');

  // Interpolate {{brand.*}} vars in an overridden system prompt (analysis
  // hasn't run yet, so only brand.info-derived vars resolve here).
  const system = analyzeOverride?.systemPrompt && analyzeOverride.systemPrompt.trim().length > 0
    ? interpolateSystemPrompt(analyzeOverride.systemPrompt, {
        // No analysis exists yet at analyze time; the interpolator
        // null-guards every analysis-derived var.
        brand: { info: data.info } as import('../providers/types.js').BrandContext,
      })
    : defaultSystem;

  const user = [
    `Company: ${data.info.companyName}`,
    `Industry: ${data.info.industry}`,
    `Website: ${data.info.websiteUrl ?? '(none)'}`,
    `Description: ${data.info.description}`,
    `Uploaded assets: ${Object.entries(assetCounts).map(([k, v]) => `${k}=${v}`).join(', ') || '(none)'}`,
  ].join('\n');

  try {
    const analysis = await callKieJson<BrandAnalysis>(
      AnalysisSchema as any, system, user, analyzeOverride?.model,
    );
    void recordUsage({
      workspaceId, surface: 'analyze',
      model: resolveModel(analyzeOverride, ANALYZE_MODEL),
    });

    // Sanity-check: a "successful" call that comes back with no colors and
    // no personality means the model echoed the schema instead of filling
    // it. Mark as failed so we can re-run; better than approving an empty
    // playbook.
    if (analysis.colors.length === 0 && analysis.personality.length === 0) {
      throw new Error('Model returned empty playbook (no colors or personality)');
    }

    await ref.update({
      analysis,
      status: 'ready',
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    await ref.update({
      status: 'failed',
      error: { code: 'PROVIDER_FAILED', message: (err as Error).message },
      updatedAt: new Date().toISOString(),
    });
    throw err;
  }
}
