// Catches the "revision shows old image" bug end-to-end:
//   1. POST /v1/ads/:adId/revisions/:rid/accept must copy rev.assetPath
//      onto ad.assetPath
//   2. The old assetPath must be preserved on ad.history[]
//   3. GET /v1/assets/:adId/signed-url must then return a URL that fetches
//      the NEW asset, not the old one
//
// Runs against live staging on every push — no kie.ai needed (we seed
// the ad + revision + GCS objects directly).

import './helpers/env.js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import admin from 'firebase-admin';
import {
  httpCall, createTestUser, deleteTestUser, cleanupWorkspaces,
  type E2ETestUser,
} from './helpers/client.js';

const STAGING_BUCKET = `${process.env.GCP_PROJECT}-staging-assets`;

// Tiny 1x1 images, distinguishable by byte length so we can verify which
// one the signed URL actually serves.
const PNG_OLD = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);
const PNG_NEW = Buffer.concat([
  PNG_OLD,
  Buffer.from('NEWNEW'), // make it bigger so the byte length differs
]);

async function uploadObject(path: string, body: Buffer, mime = 'image/png') {
  await admin.storage().bucket(STAGING_BUCKET).file(path).save(body, {
    metadata: { contentType: mime },
  });
}

describe('e2e: revision accept replaces the ad asset', () => {
  let user: E2ETestUser;
  let workspaceId: string;
  let batchId = '';
  let adId = '';
  let revisionId = '';
  let oldPath = '';
  let newPath = '';

  beforeAll(async () => {
    user = await createTestUser('rev-accept');
    const ws = await httpCall({
      method: 'POST', path: '/v1/workspaces',
      idToken: user.idToken, body: { name: 'Revision Accept E2E' },
    });
    workspaceId = ws.body.data.id;

    // Seed the batch + ad + revision through the Admin SDK so we don't
    // have to wait for the worker / spend kie.ai credits.
    const db = admin.firestore();
    const batchRef = db.collection(`workspaces/${workspaceId}/batches`).doc();
    const adRef = batchRef.collection('ads').doc();
    const revRef = adRef.collection('revisions').doc();
    batchId = batchRef.id;
    adId = adRef.id;
    revisionId = revRef.id;
    oldPath = `workspaces/${workspaceId}/batches/${batchId}/ads/${adId}/v1.png`;
    newPath = `workspaces/${workspaceId}/batches/${batchId}/ads/${adId}/revisions/${revisionId}/v1.png`;

    await uploadObject(oldPath, PNG_OLD);
    await uploadObject(newPath, PNG_NEW);

    const now = new Date().toISOString();
    await batchRef.set({
      id: batchId, workspaceId, name: 'Seed',
      status: 'pending_review',
      brief: {
        goal: 'conversion',
        audience: { ageGroups: ['25–34'], interests: ['Tech'] },
        offer: 'X', platforms: ['instagram'], batchSize: 1,
        creativeStyle: 'bold', tones: ['Professional'],
      },
      progress: { total: 1, completed: 1, failed: 0 },
      counters: { approved: 0, rejected: 0 },
      createdBy: user.uid, createdAt: now, updatedAt: now,
    });
    await adRef.set({
      id: adId, batchId, workspaceId,
      headline: 'Original headline',
      body: 'Original body',
      hook: 'Original hook',
      cta: 'Buy',
      platform: 'instagram', format: 'Reel', status: 'pending',
      assetPath: oldPath,
      history: [], createdAt: now, updatedAt: now,
    });
    await revRef.set({
      id: revisionId, adId,
      instruction: 'Make it pop',
      status: 'ready',
      headline: 'Revised headline',
      body: 'Revised body',
      cta: 'Shop Now',
      assetPath: newPath,
      accepted: false,
      createdBy: user.uid, createdAt: now,
    });
  });

  afterAll(async () => {
    const bucket = admin.storage().bucket(STAGING_BUCKET);
    for (const p of [oldPath, newPath]) {
      if (p) await bucket.file(p).delete().catch(() => {});
    }
    await cleanupWorkspaces(user.uid).catch(() => {});
    await deleteTestUser(user.uid).catch(() => {});
  });

  it('accept copies rev.assetPath to ad.assetPath and pushes old path to history', async () => {
    const res = await httpCall({
      method: 'POST',
      path: `/v1/ads/${adId}/revisions/${revisionId}/accept`,
      idToken: user.idToken, workspaceId,
    });
    expect(res.status).toBe(200);

    const db = admin.firestore();
    const adSnap = await db.doc(`workspaces/${workspaceId}/batches/${batchId}/ads/${adId}`).get();
    const ad = adSnap.data()!;
    expect(ad.status).toBe('approved');
    expect(ad.headline).toBe('Revised headline');
    expect(ad.body).toBe('Revised body');
    expect(ad.cta).toBe('Shop Now');
    // The headline-spec bug: assetPath must be the new one.
    expect(ad.assetPath).toBe(newPath);
    // Old asset preserved on history for audit.
    expect(Array.isArray(ad.history)).toBe(true);
    expect(ad.history.length).toBe(1);
    expect(ad.history[0].assetPath).toBe(oldPath);
    expect(ad.history[0].headline).toBe('Original headline');
  });

  it('GET /v1/assets/:adId/signed-url serves the NEW asset after accept', async () => {
    const res = await httpCall<{ url: string }>({
      method: 'GET', path: `/v1/assets/${adId}/signed-url`,
      idToken: user.idToken, workspaceId,
    });
    expect(res.status).toBe(200);

    const dl = await fetch(res.body.data!.url);
    expect(dl.status).toBe(200);
    const downloaded = Buffer.from(await dl.arrayBuffer());

    // Verify by byte-length — old vs new were uploaded with different sizes.
    expect(downloaded.length).toBe(PNG_NEW.length);
    expect(downloaded.length).not.toBe(PNG_OLD.length);
  });
});
