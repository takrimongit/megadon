import type { AiPricingTable, ModelPricing } from '@megadon/types';

export function priceFor(
  table: AiPricingTable,
  model: string | undefined,
  kind: 'call' | 'image' | 'video',
  fallbackModel: string,
): ModelPricing {
  const m = model && model.trim() ? model.trim() : fallbackModel;
  return table.models[m] ?? table.fallback[kind];
}

export function fmtCredits(credits: number): string {
  return credits >= 100 ? Math.round(credits).toLocaleString() : String(+credits.toFixed(1));
}

export function fmtUsd(usd: number): string {
  return usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`;
}

export function fmtDuration(seconds: number): string {
  if (seconds < 60) return `~${Math.round(seconds)}s`;
  return `~${Math.round(seconds / 60)} min`;
}

/** One-line estimate label, e.g. "≈ 6 credits ($0.03) · ~25s / image". */
export function estimateLabel(p: ModelPricing): string {
  return `≈ ${fmtCredits(p.estCredits)} credits (${fmtUsd(p.estUsd)}) · ${fmtDuration(p.estSeconds)} / ${p.unit}`;
}
