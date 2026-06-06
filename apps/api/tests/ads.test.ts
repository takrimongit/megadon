import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { mockOpenAI } from './helpers/mocks.js';

mockOpenAI();

import { call, closeApp } from './helpers/app.js';
import { clearFirestore, createTestUser } from './helpers/auth.js';
import { db } from '../src/lib/firebase.js';
import type { Brief } from '@megadon/types';

async function setup(userEmail = 'ad@test.com') {
  const user = await createTestUser(userEmail);
  const ws = await call({
    method: 'POST', url: '/v1/workspaces', idToken: user.idToken, body: { name: 'WS' },
  });
  const wid = (ws.body.data as any).id;
  return { user, wid };
}

const brief: Brief = {
  goal: 'conversion',
  audience: { ageGroups: ['25–34'], interests: ['Tech'] },
  offer: 'Free trial of our SaaS',
  platforms: ['instagram'],
  batchSize: 3,
  creativeStyle: 'minimal',
  tones: ['Professional'],
};

async function seedBatchWithAds(wid: string, uid: string) {
  // Manually seed a batch + pending ads so we don't rely on the worker pipeline.
  const batchRef = db().collection(`workspaces/${wid}/batches`).doc();
  const now = new Date().toISOString();
  await batchRef.set({
    id: batchRef.id, workspaceId: wid, name: 'Manual', status: 'pending_review',
    brief, progress: { total: 3, completed: 3, failed: 0 },
    counters: { approved: 0, rejected: 0 },
    createdBy: uid, createdAt: now, updatedAt: now,
  });
  const adIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    const adRef = batchRef.collection('ads').doc();
    await adRef.set({
      id: adRef.id, batchId: batchRef.id, workspaceId: wid,
      headline: `Ad ${i}`, body: 'Body', hook: 'Hook', cta: 'Shop',
      platform: 'instagram', format: 'Reel', status: 'pending',
      score: 80, assetPath: `workspaces/${wid}/batches/${batchRef.id}/ads/${adRef.id}/v1.jpg`,
      history: [], createdAt: now, updatedAt: now,
    });
    adIds.push(adRef.id);
  }
  return { batchId: batchRef.id, adIds };
}

describe('Ad approval flow', () => {
  beforeAll(async () => { await clearFirestore(); });
  beforeEach(async () => { await clearFirestore(); });
  afterAll(async () => { await closeApp(); });

  it('approves a single ad and increments batch counter', async () => {
    const { user, wid } = await setup();
    const { batchId, adIds } = await seedBatchWithAds(wid, user.uid);

    const res = await call({
      method: 'PATCH',
      url: `/v1/ads/${adIds[0]}`,
      idToken: user.idToken,
      workspaceId: wid,
      body: { status: 'approved' },
    });
    expect(res.status).toBe(200);

    const batch = await db().doc(`workspaces/${wid}/batches/${batchId}`).get();
    expect(batch.data()!.counters.approved).toBe(1);
    expect(batch.data()!.counters.rejected).toBe(0);
  });

  it('bulk decisions transition batch to approved when all decided', async () => {
    const { user, wid } = await setup();
    const { batchId, adIds } = await seedBatchWithAds(wid, user.uid);

    const res = await call({
      method: 'POST',
      url: `/v1/batches/${batchId}/decisions`,
      idToken: user.idToken,
      workspaceId: wid,
      body: {
        decisions: [
          { adId: adIds[0], status: 'approved' },
          { adId: adIds[1], status: 'approved' },
          { adId: adIds[2], status: 'rejected' },
        ],
      },
    });
    expect(res.status).toBe(200);

    const batch = await db().doc(`workspaces/${wid}/batches/${batchId}`).get();
    expect(batch.data()!.counters.approved).toBe(2);
    expect(batch.data()!.counters.rejected).toBe(1);
    expect(batch.data()!.status).toBe('approved');
  });

  it('rejects all → batch becomes archived', async () => {
    const { user, wid } = await setup();
    const { batchId, adIds } = await seedBatchWithAds(wid, user.uid);

    await call({
      method: 'POST',
      url: `/v1/batches/${batchId}/decisions`,
      idToken: user.idToken,
      workspaceId: wid,
      body: { decisions: adIds.map((adId) => ({ adId, status: 'rejected' as const })) },
    });

    const batch = await db().doc(`workspaces/${wid}/batches/${batchId}`).get();
    expect(batch.data()!.status).toBe('archived');
  });

  it('validates patch body', async () => {
    const { user, wid } = await setup();
    const { adIds } = await seedBatchWithAds(wid, user.uid);

    const res = await call({
      method: 'PATCH',
      url: `/v1/ads/${adIds[0]}`,
      idToken: user.idToken,
      workspaceId: wid,
      body: { status: 'maybe' as any },
    });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_FAILED');
  });
});

describe('Ad revision flow', () => {
  beforeAll(async () => { await clearFirestore(); });
  beforeEach(async () => { await clearFirestore(); });
  afterAll(async () => { await closeApp(); });

  it('creates a revision, finishes it, accepts it, updates ad copy + history', async () => {
    const { user, wid } = await setup();
    const { batchId, adIds } = await seedBatchWithAds(wid, user.uid);
    const adId = adIds[0];

    // Request revision.
    const req = await call({
      method: 'POST',
      url: `/v1/ads/${adId}/revisions`,
      idToken: user.idToken,
      workspaceId: wid,
      body: { instruction: 'Make it more urgent' },
    });
    expect(req.status).toBe(201);
    const { revisionId } = req.body.data as any;

    // Simulate the worker finishing the revision (emulator fire-and-forget
    // may have already done this; ensure it's ready before we accept).
    const adPath = `workspaces/${wid}/batches/${batchId}/ads/${adId}`;
    const revRef = db().doc(`${adPath}/revisions/${revisionId}`);

    // Wait briefly for the in-process worker to write status='ready'.
    let revData: any;
    for (let i = 0; i < 20; i++) {
      const snap = await revRef.get();
      revData = snap.data();
      if (revData?.status === 'ready') break;
      await new Promise((r) => setTimeout(r, 100));
    }
    if (revData?.status !== 'ready') {
      // Fallback: write the revision result ourselves (the in-process enqueue
      // path may not be wired in the test runner).
      await revRef.update({
        headline: 'Revised Headline', body: 'New body', cta: 'Buy Now', status: 'ready',
      });
    }

    // Accept the revision.
    const accept = await call({
      method: 'POST',
      url: `/v1/ads/${adId}/revisions/${revisionId}/accept`,
      idToken: user.idToken,
      workspaceId: wid,
    });
    expect(accept.status).toBe(200);

    const ad = await db().doc(adPath).get();
    const adData = ad.data()!;
    expect(adData.headline).toBe('Revised Headline');
    expect(adData.status).toBe('approved');
    expect(adData.history.length).toBe(1);
    expect(adData.history[0].headline).toBe('Ad 0');
  });
});
