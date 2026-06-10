// Verifies that submitting a Brief with mediaType='video' makes its way
// through to the ad doc — without paying for a real Veo job.
//
// The full Veo pipeline (real kie.ai call + mp4 download + GCS) is
// covered separately by tests/e2e/video-pipeline.full.e2e.test.ts.

import './helpers/env.js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import admin from 'firebase-admin';
import {
  httpCall, createTestUser, deleteTestUser, cleanupWorkspaces,
  type E2ETestUser,
} from './helpers/client.js';
import type { Brief, Batch, Ad } from '@megadon/types';

const brief: Brief = {
  goal: 'awareness',
  audience: { ageGroups: ['25–34'], interests: ['Tech'] },
  offer: 'Free trial of our SaaS',
  platforms: ['instagram'],
  batchSize: 1,
  creativeStyle: 'bold',
  tones: ['Professional'],
  mediaType: 'video',
};

describe('e2e: video brief carries through to ad doc', () => {
  let user: E2ETestUser;
  let workspaceId: string;

  beforeAll(async () => {
    user = await createTestUser('video-brief');
    const ws = await httpCall({
      method: 'POST', path: '/v1/workspaces',
      idToken: user.idToken, body: { name: 'Video brief E2E' },
    });
    workspaceId = ws.body.data.id;
  });

  afterAll(async () => {
    await cleanupWorkspaces(user.uid).catch(() => {});
    await deleteTestUser(user.uid).catch(() => {});
  });

  it('creates a batch + ad with mediaType=video', async () => {
    const create = await httpCall<{ batchId: string }>({
      method: 'POST', path: '/v1/batches',
      idToken: user.idToken, workspaceId,
      body: { name: 'Video smoke', brief },
    });
    expect(create.status).toBe(201);
    const batchId = create.body.data!.batchId;

    const db = admin.firestore();
    const batchSnap = await db.doc(`workspaces/${workspaceId}/batches/${batchId}`).get();
    expect(batchSnap.exists).toBe(true);
    const batchData = batchSnap.data() as Batch;
    expect(batchData.brief.mediaType).toBe('video');

    const ads = await db.collection(`workspaces/${workspaceId}/batches/${batchId}/ads`).get();
    expect(ads.size).toBe(1);
    const ad = ads.docs[0].data() as Ad;
    expect(ad.mediaType).toBe('video');
  });

  it('Zod validator accepts the new mediaType field', async () => {
    const bad = await httpCall({
      method: 'POST', path: '/v1/batches',
      idToken: user.idToken, workspaceId,
      body: { name: 'Invalid media', brief: { ...brief, mediaType: 'gif' as any } },
    });
    expect(bad.status).toBe(400);
    expect(bad.body.error?.code).toBe('VALIDATION_FAILED');
  });
});
