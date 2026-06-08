import { db } from '../lib/firebase.js';
import { z } from 'zod';
import { config } from '../lib/config.js';
import { AppError } from '../lib/errors.js';
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

async function callKieJson<T>(schema: z.ZodSchema<T>, system: string, user: string): Promise<T> {
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
    throw AppError.provider(`kie.ai analysis ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  }
  const json = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content ?? '{}';
  return schema.parse(JSON.parse(unwrapJson(raw)));
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
  const system = [
    'You build a brand intelligence playbook for an AI ad generator.',
    'Reply with ONLY a valid JSON object — no prose, no markdown — matching this shape:',
    '{',
    '  "colors": [{ "hex": "#RRGGBB", "name": "string", "role": "primary|accent|neutral" }],',
    '  "personality": ["adjective", ...],   // 4-6 items',
    '  "toneOfVoice": "1-2 sentences",',
    '  "visualStyle": "1-2 sentences",',
    '  "targetAudience": "1-2 sentences",',
    '  "creativeStyles": ["chip", ...],     // 3-5 short labels (e.g. "Bold typography", "Lifestyle photography")',
    '  "brandRules": ["do/don\'t rule", ...], // 5-7 short imperatives',
    '  "messagingStyle": "1-2 sentences",',
    '  "ctaPreferences": ["CTA", ...],       // 3-5 short examples',
    '  "confidence": { "colors": 0..1, "personality": 0..1, "toneOfVoice": 0..1, "visualStyle": 0..1, "audience": 0..1 }',
    '}',
    'Pick 4-6 plausible brand colors based on the industry conventions.',
    'Be specific and grounded; avoid generic filler.',
  ].join('\n');

  const user = [
    `Company: ${data.info.companyName}`,
    `Industry: ${data.info.industry}`,
    `Website: ${data.info.websiteUrl ?? '(none)'}`,
    `Description: ${data.info.description}`,
    `Uploaded assets: ${Object.entries(assetCounts).map(([k, v]) => `${k}=${v}`).join(', ') || '(none)'}`,
  ].join('\n');

  try {
    const analysis = await callKieJson<BrandAnalysis>(AnalysisSchema as any, system, user);
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
