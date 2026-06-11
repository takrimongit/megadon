// Best-effort cost/time estimates for the models we expose, derived from
// kie.ai's published pricing pages (https://kie.ai/pricing — 1 credit =
// $0.005; Veo 3 Fast ≈ 80 credits/video, Veo 3 Quality ≈ 400). Chat and
// image figures are approximations of typical per-operation cost. These
// power UI estimates only — actual billing lives in the kie.ai dashboard.

import type { AiPricingTable, ModelPricing } from '@megadon/types';

export const CREDIT_USD = 0.005;

function p(unit: ModelPricing['unit'], estCredits: number, estSeconds: number): ModelPricing {
  return { unit, estCredits, estUsd: +(estCredits * CREDIT_USD).toFixed(4), estSeconds };
}

const MODELS: Record<string, ModelPricing> = {
  // Chat (per call — short structured-output completions)
  'gpt-5-2': p('call', 2, 15),
  'gpt-4o': p('call', 1, 6),
  'gemini-2.5-flash': p('call', 1, 5),
  'claude-sonnet-4-6': p('call', 2, 8),

  // Image (per image)
  'flux-2/pro-text-to-image': p('image', 6, 25),
  'flux-2/dev-text-to-image': p('image', 3, 18),
  'stable-diffusion-3.5-large': p('image', 7, 30),

  // Video (per clip)
  'veo3_lite': p('video', 80, 75),
  'veo3': p('video', 400, 150),
  'kling-1.6': p('video', 50, 90),
};

const FALLBACK: AiPricingTable['fallback'] = {
  call: p('call', 2, 10),
  image: p('image', 6, 25),
  video: p('video', 80, 90),
};

export function getPricingTable(): AiPricingTable {
  return { creditUsd: CREDIT_USD, models: MODELS, fallback: FALLBACK };
}

export function priceFor(model: string, kind: 'call' | 'image' | 'video'): ModelPricing {
  return MODELS[model] ?? FALLBACK[kind];
}
