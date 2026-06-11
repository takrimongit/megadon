import type { FastifyInstance } from 'fastify';
import { requireAuth, requireWorkspace } from '../middleware/auth.js';
import { ok } from '../lib/envelope.js';
import { db } from '../lib/firebase.js';
import { config } from '../lib/config.js';
import { getPricingTable, CREDIT_USD } from '../lib/aiPricing.js';
import type { UsageBucket, UsageEntry, UsageSummary } from '@megadon/types';

const WINDOW_DAYS = 30;

// kie.ai credit balance, cached briefly so the dashboard doesn't hammer it.
let creditCache: { value: number; fetchedAt: number } | null = null;
const CREDIT_CACHE_MS = 60_000;

async function fetchKieCredits(): Promise<number | null> {
  if (!config.kieKey) return null;
  if (creditCache && Date.now() - creditCache.fetchedAt < CREDIT_CACHE_MS) {
    return creditCache.value;
  }
  try {
    const resp = await fetch('https://api.kie.ai/api/v1/chat/credit', {
      headers: { Authorization: `Bearer ${config.kieKey}` },
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as { code: number; data?: number };
    if (json.code !== 200 || typeof json.data !== 'number') return null;
    creditCache = { value: json.data, fetchedAt: Date.now() };
    return json.data;
  } catch {
    return null;
  }
}

function bucketize(entries: UsageEntry[], key: (e: UsageEntry) => string): UsageBucket[] {
  const map = new Map<string, UsageBucket>();
  for (const e of entries) {
    const k = key(e);
    const b = map.get(k) ?? { key: k, operations: 0, estCredits: 0, estUsd: 0 };
    b.operations += e.units;
    b.estCredits += e.estCredits;
    b.estUsd += e.estUsd;
    map.set(k, b);
  }
  return [...map.values()]
    .map((b) => ({ ...b, estCredits: +b.estCredits.toFixed(2), estUsd: +b.estUsd.toFixed(4) }))
    .sort((a, b) => b.estCredits - a.estCredits);
}

export async function usageRoutes(app: FastifyInstance) {
  // Pricing is static and global — auth only.
  app.get('/usage/pricing', { preHandler: requireAuth }, async (_req, reply) =>
    ok(reply, getPricingTable()),
  );

  app.get(
    '/usage/summary',
    { preHandler: [requireAuth, requireWorkspace] },
    async (req, reply) => {
      const wid = req.workspace!.id;
      const cutoff = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();

      const [snap, credits] = await Promise.all([
        db()
          .collection(`workspaces/${wid}/usage`)
          .where('createdAt', '>=', cutoff)
          .get(),
        fetchKieCredits(),
      ]);

      const entries = snap.docs.map((d) => d.data() as UsageEntry);
      const totals = entries.reduce(
        (acc, e) => ({
          operations: acc.operations + e.units,
          estCredits: acc.estCredits + e.estCredits,
          estUsd: acc.estUsd + e.estUsd,
        }),
        { operations: 0, estCredits: 0, estUsd: 0 },
      );

      const summary: UsageSummary = {
        windowDays: WINDOW_DAYS,
        creditsRemaining: credits,
        creditsRemainingUsd: credits === null ? null : +(credits * CREDIT_USD).toFixed(2),
        totals: {
          operations: totals.operations,
          estCredits: +totals.estCredits.toFixed(2),
          estUsd: +totals.estUsd.toFixed(4),
        },
        byModel: bucketize(entries, (e) => e.model),
        bySurface: bucketize(entries, (e) => e.surface),
      };
      return ok(reply, summary);
    },
  );
}
