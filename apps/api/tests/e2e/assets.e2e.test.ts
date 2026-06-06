// Validates GET /v1/assets/:adId/signed-url end-to-end against real
// Cloud Storage. Catches:
//   - missing IAM (api-runtime → serviceAccountTokenCreator on self)
//   - wrong default bucket
//   - signed URL not actually working

import './helpers/env.js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import admin from 'firebase-admin';
import {
  httpCall, createTestUser, deleteTestUser, cleanupWorkspaces,
  type E2ETestUser,
} from './helpers/client.js';

// A 1x1 transparent PNG, kept inline so the test is self-contained.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

const STAGING_BUCKET = `${process.env.GCP_PROJECT}-staging-assets`;

describe('e2e: signed asset URL', () => {
  let user: E2ETestUser;
  let workspaceId: string;
  let assetPath = '';

  beforeAll(async () => {
    user = await createTestUser('asset');
    const ws = await httpCall({
      method: 'POST', path: '/v1/workspaces',
      idToken: user.idToken, body: { name: 'Asset E2E' },
    });
    workspaceId = ws.body.data.id;
  });

  afterAll(async () => {
    if (assetPath) {
      try { await admin.storage().bucket(STAGING_BUCKET).file(assetPath).delete(); } catch {}
    }
    await cleanupWorkspaces(user.uid).catch(() => {});
    await deleteTestUser(user.uid).catch(() => {});
  });

  it('returns a working signed URL for an existing ad asset', async () => {
    const db = admin.firestore();
    const batchRef = db.collection(`workspaces/${workspaceId}/batches`).doc();
    const adRef = batchRef.collection('ads').doc();
    assetPath = `workspaces/${workspaceId}/batches/${batchRef.id}/ads/${adRef.id}/v1.png`;

    // Upload a tiny PNG to GCS.
    await admin.storage().bucket(STAGING_BUCKET).file(assetPath).save(TINY_PNG, {
      contentType: 'image/png',
    });

    // Seed batch + ad docs that point at it.
    const now = new Date().toISOString();
    await batchRef.set({
      id: batchRef.id, workspaceId, name: 'asset-test', status: 'pending_review',
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
      id: adRef.id, batchId: batchRef.id, workspaceId,
      headline: 'h', body: 'b', hook: 'h', cta: 'c',
      platform: 'instagram', format: 'Reel', status: 'pending',
      assetPath, history: [], createdAt: now, updatedAt: now,
    });

    // Hit the signed-url endpoint.
    const res = await httpCall({
      method: 'GET', path: `/v1/assets/${adRef.id}/signed-url`,
      idToken: user.idToken, workspaceId,
    });
    expect(res.status).toBe(200);
    expect(res.body.data?.url).toMatch(/^https:\/\//);
    expect(res.body.data?.expiresIn).toBe(900);

    // The returned URL must actually serve the file.
    const dl = await fetch(res.body.data.url);
    expect(dl.status).toBe(200);
    expect(dl.headers.get('content-type')).toContain('image');
    const downloaded = Buffer.from(await dl.arrayBuffer());
    expect(downloaded.length).toBe(TINY_PNG.length);
  }, 30_000);

  it('returns 404 when the ad has no assetPath', async () => {
    const db = admin.firestore();
    const batchRef = db.collection(`workspaces/${workspaceId}/batches`).doc();
    const adRef = batchRef.collection('ads').doc();
    const now = new Date().toISOString();
    await batchRef.set({
      id: batchRef.id, workspaceId, name: 'no-asset', status: 'pending_review',
      brief: {
        goal: 'conversion',
        audience: { ageGroups: ['25–34'], interests: [] },
        offer: 'X', platforms: ['instagram'], batchSize: 1,
        creativeStyle: 'bold', tones: [],
      },
      progress: { total: 1, completed: 1, failed: 0 },
      counters: { approved: 0, rejected: 0 },
      createdBy: user.uid, createdAt: now, updatedAt: now,
    });
    await adRef.set({
      id: adRef.id, batchId: batchRef.id, workspaceId,
      platform: 'instagram', format: 'Reel', status: 'generating',
      history: [], createdAt: now, updatedAt: now,
    });

    const res = await httpCall({
      method: 'GET', path: `/v1/assets/${adRef.id}/signed-url`,
      idToken: user.idToken, workspaceId,
    });
    expect(res.status).toBe(404);
  });
});
