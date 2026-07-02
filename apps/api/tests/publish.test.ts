import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { mockCopyProvider } from './helpers/mocks.js';

mockCopyProvider();

import { call, closeApp } from './helpers/app.js';
import { clearFirestore, createTestUser } from './helpers/auth.js';
import { db } from '../src/lib/firebase.js';
import { runPublishAd } from '../src/jobs/publishAd.js';
import { metaSettingsRef } from '../src/lib/metaSettings.js';
import type { Brief } from '@megadon/types';

async function setup(userEmail = 'publish@test.com') {
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
  offer: 'Free trial',
  platforms: ['instagram'],
  batchSize: 1,
  creativeStyle: 'minimal',
  tones: ['Professional'],
};

async function seedApprovedAd(wid: string, uid: string, overrides: Record<string, unknown> = {}) {
  const batchRef = db().collection(`workspaces/${wid}/batches`).doc();
  const now = new Date().toISOString();
  await batchRef.set({
    id: batchRef.id, workspaceId: wid, name: 'B', status: 'approved',
    brief, progress: { total: 1, completed: 1, failed: 0 },
    counters: { approved: 1, rejected: 0 },
    createdBy: uid, createdAt: now, updatedAt: now,
  });
  const adRef = batchRef.collection('ads').doc();
  await adRef.set({
    id: adRef.id, batchId: batchRef.id, workspaceId: wid,
    headline: 'Big Sale', body: 'Body copy', cta: 'Shop now',
    platform: 'instagram', format: 'Reel', status: 'approved',
    mediaType: 'image',
    assetPath: `workspaces/${wid}/batches/${batchRef.id}/ads/${adRef.id}/v1.jpg`,
    history: [], createdAt: now, updatedAt: now,
    ...overrides,
  });
  return { batchId: batchRef.id, adId: adRef.id };
}

async function connectMeta(wid: string) {
  await metaSettingsRef(wid).set({
    connected: true,
    facebookPageId: '1234567890',
    pageName: 'My Page',
    instagramUserId: '9876543210',
    tokenSet: true,
    updatedAt: new Date().toISOString(),
  });
}

describe('Meta settings', () => {
  beforeAll(async () => { await clearFirestore(); });
  beforeEach(async () => { await clearFirestore(); });
  afterAll(async () => { await closeApp(); });

  it('defaults to disconnected', async () => {
    const { user, wid } = await setup();
    const res = await call({
      method: 'GET', url: '/v1/settings/meta', idToken: user.idToken, workspaceId: wid,
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ connected: false, tokenSet: false });
  });

  it('connects when page id + token provided, never leaks the token', async () => {
    const { user, wid } = await setup();
    const res = await call({
      method: 'PUT', url: '/v1/settings/meta', idToken: user.idToken, workspaceId: wid,
      body: {
        facebookPageId: '1234567890',
        pageName: 'My Page',
        instagramUserId: '9876543210',
        pageAccessToken: 'secret-long-lived-token',
      },
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      connected: true,
      tokenSet: true,
      facebookPageId: '1234567890',
      instagramUserId: '9876543210',
    });
    expect(JSON.stringify(res.body.data)).not.toContain('secret-long-lived-token');
  });

  it('is not connected with a page id but no token', async () => {
    const { user, wid } = await setup();
    const res = await call({
      method: 'PUT', url: '/v1/settings/meta', idToken: user.idToken, workspaceId: wid,
      body: { facebookPageId: '1234567890' },
    });
    expect(res.body.data).toMatchObject({ connected: false, tokenSet: false });
  });
});

describe('Publish endpoint', () => {
  beforeAll(async () => { await clearFirestore(); });
  beforeEach(async () => { await clearFirestore(); });
  afterAll(async () => { await closeApp(); });

  it('accepts a publish request for an approved ad and marks it publishing', async () => {
    const { user, wid } = await setup();
    await connectMeta(wid);
    const { adId } = await seedApprovedAd(wid, user.uid);

    const res = await call({
      method: 'POST', url: `/v1/ads/${adId}/publish`, idToken: user.idToken, workspaceId: wid,
      body: { targets: ['facebook', 'instagram'] },
    });
    expect(res.status).toBe(202);

    const ad = await db().collectionGroup('ads').where('id', '==', adId).limit(1).get();
    expect(ad.docs[0].data().publish.status).toBe('publishing');
  });

  it('rejects publishing an unapproved ad', async () => {
    const { user, wid } = await setup();
    await connectMeta(wid);
    const { adId } = await seedApprovedAd(wid, user.uid, { status: 'pending' });

    const res = await call({
      method: 'POST', url: `/v1/ads/${adId}/publish`, idToken: user.idToken, workspaceId: wid,
      body: { targets: ['facebook'] },
    });
    expect(res.status).toBe(400);
  });

  it('rejects an ad with no asset', async () => {
    const { user, wid } = await setup();
    await connectMeta(wid);
    const { adId } = await seedApprovedAd(wid, user.uid, { assetPath: null });

    const res = await call({
      method: 'POST', url: `/v1/ads/${adId}/publish`, idToken: user.idToken, workspaceId: wid,
      body: { targets: ['facebook'] },
    });
    expect(res.status).toBe(400);
  });

  it('validates the targets body', async () => {
    const { user, wid } = await setup();
    await connectMeta(wid);
    const { adId } = await seedApprovedAd(wid, user.uid);

    const res = await call({
      method: 'POST', url: `/v1/ads/${adId}/publish`, idToken: user.idToken, workspaceId: wid,
      body: { targets: [] },
    });
    expect(res.status).toBe(400);
  });
});

describe('runPublishAd job (fake Meta provider)', () => {
  beforeAll(async () => { await clearFirestore(); });
  beforeEach(async () => { await clearFirestore(); });
  afterAll(async () => { await closeApp(); });

  it('publishes to both platforms and records remote ids', async () => {
    const { user, wid } = await setup();
    await connectMeta(wid);
    const { batchId, adId } = await seedApprovedAd(wid, user.uid);

    await runPublishAd({
      workspaceId: wid, batchId, adId,
      targets: ['facebook', 'instagram'], requestedBy: user.uid,
    });

    const adSnap = await db().doc(`workspaces/${wid}/batches/${batchId}/ads/${adId}`).get();
    const publish = adSnap.data()!.publish;
    expect(publish.status).toBe('published');
    expect(publish.targets).toHaveLength(2);
    for (const t of publish.targets) {
      expect(t.status).toBe('published');
      expect(t.remoteId).toBeTruthy();
    }
  });

  it('fails cleanly when Meta is not connected', async () => {
    const { user, wid } = await setup();
    const { batchId, adId } = await seedApprovedAd(wid, user.uid);

    await runPublishAd({
      workspaceId: wid, batchId, adId, targets: ['facebook'], requestedBy: user.uid,
    });

    const adSnap = await db().doc(`workspaces/${wid}/batches/${batchId}/ads/${adId}`).get();
    expect(adSnap.data()!.publish.status).toBe('failed');
  });

  it('reports partial when one target has no destination configured', async () => {
    const { user, wid } = await setup();
    await metaSettingsRef(wid).set({
      connected: true,
      facebookPageId: '1234567890',
      tokenSet: true,
      updatedAt: new Date().toISOString(),
    });
    const { batchId, adId } = await seedApprovedAd(wid, user.uid);

    await runPublishAd({
      workspaceId: wid, batchId, adId,
      targets: ['facebook', 'instagram'], requestedBy: user.uid,
    });

    const adSnap = await db().doc(`workspaces/${wid}/batches/${batchId}/ads/${adId}`).get();
    const publish = adSnap.data()!.publish;
    expect(publish.status).toBe('partial');
    const fb = publish.targets.find((t: any) => t.platform === 'facebook');
    const ig = publish.targets.find((t: any) => t.platform === 'instagram');
    expect(fb.status).toBe('published');
    expect(ig.status).toBe('failed');
  });
});
