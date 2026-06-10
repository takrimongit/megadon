// Full text-to-video pipeline against live staging. Submits a video
// brief, polls Firestore for batch.status='pending_review' (or 'failed'),
// and verifies the ad has a real mp4 in GCS whose signed URL serves
// video bytes.
//
// Veo takes longer than FLUX — typical end-to-end ~60-120 s. Test timeout
// is generous. Costs real money (~$0.10 per run on veo3_lite).

import './helpers/env.js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import admin from 'firebase-admin';
import {
  httpCall, createTestUser, deleteTestUser, cleanupWorkspaces,
  type E2ETestUser,
} from './helpers/client.js';
import type { Brief } from '@megadon/types';

const TERMINAL = ['pending_review', 'failed'] as const;
const MAX_WAIT_MS = 5 * 60_000; // 5 min

const brief: Brief = {
  goal: 'awareness',
  audience: { ageGroups: ['25–34'], interests: ['Tech'] },
  offer: 'Cloud platform 14-day free trial',
  platforms: ['instagram'],
  batchSize: 1,
  creativeStyle: 'bold',
  tones: ['Professional'],
  mediaType: 'video',
};

describe('e2e: full video pipeline (Veo 3.1 Light)', () => {
  let user: E2ETestUser;
  let workspaceId: string;

  beforeAll(async () => {
    user = await createTestUser('video-full');
    const ws = await httpCall({
      method: 'POST', path: '/v1/workspaces',
      idToken: user.idToken, body: { name: 'Video full E2E' },
    });
    workspaceId = ws.body.data.id;
  });

  afterAll(async () => {
    await cleanupWorkspaces(user.uid).catch(() => {});
    await deleteTestUser(user.uid).catch(() => {});
  });

  it('Brief(mediaType=video) → Veo → mp4 in GCS, signed URL works', async () => {
    const create = await httpCall<{ batchId: string }>({
      method: 'POST', path: '/v1/batches',
      idToken: user.idToken, workspaceId,
      body: { name: 'Video pipeline run', brief },
    });
    expect(create.status).toBe(201);
    const batchId = create.body.data!.batchId;

    const db = admin.firestore();
    const batchRef = db.doc(`workspaces/${workspaceId}/batches/${batchId}`);

    const begin = Date.now();
    let finalStatus = '';
    while (Date.now() - begin < MAX_WAIT_MS) {
      const snap = await batchRef.get();
      const status = snap.data()?.status as string;
      if (TERMINAL.includes(status as any)) { finalStatus = status; break; }
      await new Promise((r) => setTimeout(r, 2000));
    }

    if (finalStatus !== 'pending_review') {
      const adSnap = await batchRef.collection('ads').get();
      const ad = adSnap.docs[0]?.data();
      throw new Error(
        `video pipeline did not reach pending_review — final=${finalStatus} ` +
        `adStatus=${ad?.status} error=${JSON.stringify(ad?.error)}`,
      );
    }

    const ads = await batchRef.collection('ads').get();
    expect(ads.size).toBe(1);
    const ad = ads.docs[0].data();
    expect(ad.status).toBe('pending');
    expect(ad.mediaType).toBe('video');
    expect(ad.assetPath).toMatch(/\.mp4$/);

    const sig = await httpCall<{ url: string }>({
      method: 'GET', path: `/v1/assets/${ad.id}/signed-url`,
      idToken: user.idToken, workspaceId,
    });
    expect(sig.status).toBe(200);
    const dl = await fetch(sig.body.data!.url, { method: 'HEAD' });
    expect(dl.status).toBe(200);
    expect(dl.headers.get('content-type')).toMatch(/video|mp4|octet-stream/);
  }, MAX_WAIT_MS + 60_000);
});
