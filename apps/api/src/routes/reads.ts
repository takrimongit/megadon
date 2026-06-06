import type { FastifyInstance } from 'fastify';
import { db, bucket } from '../lib/firebase.js';
import { requireAuth, requireWorkspace } from '../middleware/auth.js';
import { ok } from '../lib/envelope.js';
import { AppError } from '../lib/errors.js';
import type { DashboardStats } from '@megadon/types';

export async function readRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireWorkspace);

  // Dashboard stats (cached aggregate doc, fallback to mock).
  app.get('/dashboard/stats', async (req, reply) => {
    const wid = req.workspace!.id;
    const snap = await db().doc(`workspaces/${wid}/aggregates/dashboard`).get();
    const stats: DashboardStats = snap.exists
      ? (snap.data() as DashboardStats)
      : { activeCampaigns: 0, adsGenerated: 0, approvalRate: 0, avgRoas: 0 };
    return ok(reply, stats);
  });

  // Signed read URL for an ad asset
  app.get('/assets/:adId/signed-url', async (req, reply) => {
    const { adId } = req.params as { adId: string };
    const wid = req.workspace!.id;
    const adSnap = await db()
      .collectionGroup('ads')
      .where('id', '==', adId)
      .where('workspaceId', '==', wid)
      .limit(1)
      .get();
    if (adSnap.empty) throw AppError.notFound();
    const { assetPath } = adSnap.docs[0].data();
    if (!assetPath) throw AppError.notFound('Asset not generated yet');

    const [url] = await bucket().file(assetPath).getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000,
    });
    return ok(reply, { url, expiresIn: 900 });
  });

  // ============ STUBS — deterministic mock data ============

  app.get('/campaigns/:id/metrics', async (req, reply) => {
    const { id } = req.params as { id: string };
    const q = (req.query as { period?: string }).period ?? '30d';
    return ok(reply, {
      campaignId: id,
      period: q,
      metrics: {
        impressions: 284_000,
        clicks: 12_400,
        ctr: 0.0436,
        roas: 3.2,
        spend: 4200,
        conversions: 342,
      },
      topAds: [
        { id: 'ad-1', headline: 'Shop the Summer Drop', roas: '4.8×', ctr: '6.2%' },
        { id: 'ad-2', headline: 'Limited Time: 30% Off', roas: '4.1×', ctr: '5.8%' },
        { id: 'ad-3', headline: "Don't Miss Out", roas: '3.7×', ctr: '5.1%' },
      ],
    });
  });

  app.get('/ads/:adId/intelligence', async (req, reply) => {
    const { adId } = req.params as { adId: string };
    return ok(reply, {
      adId,
      metrics: { roas: '4.1×', ctr: '5.8%', impressions: '48K', conversions: 87 },
      audienceBreakdown: [
        { label: 'Age 25–34', share: 42 },
        { label: 'Age 18–24', share: 28 },
        { label: 'Age 35–44', share: 18 },
        { label: 'Other', share: 12 },
      ],
      aiNotes: [
        'Urgency language ("Limited Time") drove a 1.8× higher CTR than non-urgent variants',
        'The summer color palette resonated strongly with the 25–34 segment',
        'Short-form video (≤15s) outperformed static images by 2.3×',
      ],
    });
  });

  app.get('/playbook', async (_req, reply) => {
    return ok(reply, {
      lastUpdated: new Date().toISOString(),
      campaignCount: 24,
      adCount: 1200,
      rules: [
        { icon: 'schedule', title: 'Optimal Post Time', value: '7–10 PM weekdays', confidence: 94 },
        { icon: 'people', title: 'Primary Audience', value: 'Trendsetters, 25–34', confidence: 88 },
        { icon: 'palette', title: 'Winning Visual Style', value: 'Bold & Energetic', confidence: 82 },
        { icon: 'text-fields', title: 'Best Copy Length', value: '<15 words headline', confidence: 79 },
        { icon: 'play-circle', title: 'Top Format', value: 'Short-form Video ≤15s', confidence: 91 },
        { icon: 'local-offer', title: 'CTA Style', value: 'Urgency + scarcity', confidence: 86 },
      ],
    });
  });

  app.get('/insights', async (_req, reply) => {
    return ok(reply, {
      insights: [
        { icon: 'schedule', label: 'Best posting time', value: '7–10 PM', trend: '+2.4× CTR', positive: true },
        { icon: 'people', label: 'Top audience segment', value: 'The Trendsetter', trend: '3.1× ROAS', positive: true },
        { icon: 'palette', label: 'Best visual style', value: 'Bold & Energetic', trend: '+18% engagement', positive: true },
        { icon: 'campaign', label: 'Worst-performing goal', value: 'Brand Awareness', trend: '-0.8× ROAS', positive: false },
      ],
    });
  });
}
