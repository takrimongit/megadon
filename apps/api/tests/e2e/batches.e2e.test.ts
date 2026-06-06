import './helpers/env.js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import admin from 'firebase-admin';
import {
  httpCall, createTestUser, deleteTestUser, cleanupWorkspaces,
  type E2ETestUser,
} from './helpers/client.js';
import type { Brief } from '@megadon/types';

const brief: Brief = {
  goal: 'conversion',
  audience: { ageGroups: ['25–34'], interests: ['Fashion'] },
  offer: 'E2E test offer',
  platforms: ['instagram'],
  batchSize: 1,
  creativeStyle: 'bold',
  tones: ['Urgent'],
};

describe('e2e: batches', () => {
  let user: E2ETestUser;
  let workspaceId: string;

  beforeAll(async () => {
    user = await createTestUser('batch');
    const ws = await httpCall({
      method: 'POST', path: '/v1/workspaces', idToken: user.idToken,
      body: { name: 'Batch E2E' },
    });
    workspaceId = ws.body.data.id;
  });

  afterAll(async () => {
    await cleanupWorkspaces(user.uid).catch(() => {});
    await deleteTestUser(user.uid).catch(() => {});
  });

  it('rejects an invalid brief (validation)', async () => {
    const res = await httpCall({
      method: 'POST', path: '/v1/batches',
      idToken: user.idToken, workspaceId,
      body: { name: 'Bad', brief: { ...brief, platforms: ['mastodon'] } },
    });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_FAILED');
  });

  it('rejects /v1/batches without workspace header', async () => {
    const res = await httpCall({
      method: 'POST', path: '/v1/batches', idToken: user.idToken,
      body: { name: 'No WS header', brief },
    });
    expect(res.status).toBe(403);
  });

  it('creates a batch + placeholder ads in Firestore', async () => {
    const res = await httpCall({
      method: 'POST', path: '/v1/batches',
      idToken: user.idToken, workspaceId,
      body: { name: 'Smoke batch', brief },
    });
    expect(res.status).toBe(201);
    const batchId = res.body.data?.batchId;
    expect(batchId).toBeTruthy();

    // Verify Firestore docs were created (Admin SDK reads bypass rules).
    const db = admin.firestore();
    const batchDoc = await db.doc(`workspaces/${workspaceId}/batches/${batchId}`).get();
    expect(batchDoc.exists).toBe(true);
    expect(batchDoc.data()?.progress.total).toBe(1);

    const ads = await db.collection(`workspaces/${workspaceId}/batches/${batchId}/ads`).get();
    expect(ads.size).toBe(1);

    // The worker fires async — we don't await it. The batch's status will
    // eventually flip to pending_review (or failed if kie.ai rejects).
    // We don't assert on terminal state because that costs real API calls
    // and time. The infrastructure paths (Cloud Tasks enqueue, Firestore
    // writes) are what we're validating here.
  });
});
