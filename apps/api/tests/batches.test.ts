import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { mockCopyProvider } from './helpers/mocks.js';

mockCopyProvider();

import { call, closeApp } from './helpers/app.js';
import { clearFirestore, createTestUser } from './helpers/auth.js';
import { db } from '../src/lib/firebase.js';
import { config } from '../src/lib/config.js';
import type { Brief } from '@megadon/types';

const savedMaxAds = config.maxAdsPerBatch;

async function makeWorkspace(idToken: string): Promise<string> {
  const res = await call({
    method: 'POST', url: '/v1/workspaces', idToken, body: { name: 'Test WS' },
  });
  return (res.body.data as any).id;
}

const sampleBrief: Brief = {
  goal: 'conversion',
  audience: { ageGroups: ['25–34'], interests: ['Fashion'] },
  offer: '30% off summer collection',
  platforms: ['instagram', 'tiktok'],
  batchSize: 4,
  creativeStyle: 'bold',
  tones: ['Urgent'],
};

describe('Batches', () => {
  beforeAll(async () => { await clearFirestore(); });
  beforeEach(async () => { await clearFirestore(); config.maxAdsPerBatch = 50; });
  afterAll(async () => { config.maxAdsPerBatch = savedMaxAds; await closeApp(); });

  it('creates a batch with N placeholder ads', async () => {
    const user = await createTestUser('b@test.com');
    const wid = await makeWorkspace(user.idToken);

    const res = await call({
      method: 'POST',
      url: '/v1/batches',
      idToken: user.idToken,
      workspaceId: wid,
      body: { name: 'Summer Sale', brief: sampleBrief },
    });
    expect(res.status).toBe(201);
    const { batchId } = res.body.data as any;
    expect(batchId).toBeTruthy();

    // Verify Firestore state directly.
    const batch = await db().doc(`workspaces/${wid}/batches/${batchId}`).get();
    expect(batch.exists).toBe(true);
    expect(batch.data()!.progress.total).toBe(4);
    expect(['queued', 'generating']).toContain(batch.data()!.status);

    const ads = await db().collection(`workspaces/${wid}/batches/${batchId}/ads`).get();
    expect(ads.size).toBe(4);
    // Platforms should round-robin across the two requested.
    const platforms = ads.docs.map((d) => d.data().platform).sort();
    expect(platforms).toEqual(['instagram', 'instagram', 'tiktok', 'tiktok']);
  });

  it('caps generated ads at maxAdsPerBatch even if more requested', async () => {
    config.maxAdsPerBatch = 1;
    const user = await createTestUser('cap@test.com');
    const wid = await makeWorkspace(user.idToken);
    const res = await call({
      method: 'POST', url: '/v1/batches', idToken: user.idToken, workspaceId: wid,
      body: { name: 'Capped', brief: sampleBrief }, // batchSize 4
    });
    expect(res.status).toBe(201);
    const { batchId } = res.body.data as any;
    const batch = await db().doc(`workspaces/${wid}/batches/${batchId}`).get();
    expect(batch.data()!.progress.total).toBe(1);
    const ads = await db().collection(`workspaces/${wid}/batches/${batchId}/ads`).get();
    expect(ads.size).toBe(1);
  });

  it('rejects briefs with invalid platform', async () => {
    const user = await createTestUser('b@test.com');
    const wid = await makeWorkspace(user.idToken);

    const res = await call({
      method: 'POST',
      url: '/v1/batches',
      idToken: user.idToken,
      workspaceId: wid,
      body: { name: 'X', brief: { ...sampleBrief, platforms: ['mastodon'] as any } },
    });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_FAILED');
  });

  it('rejects batches without workspace header', async () => {
    const user = await createTestUser('b@test.com');
    const res = await call({
      method: 'POST', url: '/v1/batches', idToken: user.idToken,
      body: { name: 'X', brief: sampleBrief },
    });
    expect(res.status).toBe(403);
  });
});
