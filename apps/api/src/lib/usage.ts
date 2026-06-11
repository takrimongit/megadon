// Per-workspace AI usage ledger. Every provider call records one entry so
// the token meter can aggregate spend by model/surface. Recording is
// fire-and-forget: a ledger hiccup must never fail a generation job.

import { db } from './firebase.js';
import { priceFor } from './aiPricing.js';
import type { AiSurface, UsageEntry } from '@megadon/types';

const SURFACE_KIND: Record<AiSurface, 'call' | 'image' | 'video'> = {
  chat: 'call',
  revise: 'call',
  personas: 'call',
  analyze: 'call',
  image: 'image',
  video: 'video',
};

export async function recordUsage(input: {
  workspaceId: string;
  surface: AiSurface;
  model: string;
  units?: number;
  batchId?: string;
  adId?: string;
}): Promise<void> {
  try {
    const units = input.units ?? 1;
    const pricing = priceFor(input.model, SURFACE_KIND[input.surface]);
    const entry: UsageEntry = {
      surface: input.surface,
      model: input.model,
      units,
      estCredits: +(pricing.estCredits * units).toFixed(2),
      estUsd: +(pricing.estUsd * units).toFixed(4),
      ...(input.batchId ? { batchId: input.batchId } : {}),
      ...(input.adId ? { adId: input.adId } : {}),
      createdAt: new Date().toISOString(),
    };
    await db().collection(`workspaces/${input.workspaceId}/usage`).add(entry);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('usage ledger write failed (non-fatal):', (err as Error).message);
  }
}

/** Resolve which model a surface will actually use given a possible override. */
export function resolveModel(
  override: { model?: string } | null | undefined,
  defaultModel: string,
): string {
  return override?.model && override.model.trim().length > 0
    ? override.model.trim()
    : defaultModel;
}
