// Full Brief → Batch → Worker → kie.ai → Cloud Storage → pending_review
// pipeline against live staging. Spends real money (~$0.001 per run).
// Run only via `npm run test:e2e:full` or the workflow_dispatch promote
// gate — NOT on every push.

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
  audience: { ageGroups: ['25–34'], interests: ['Tech'] },
  offer: 'E2E full pipeline test — please ignore',
  platforms: ['instagram'],
  batchSize: 1,
  creativeStyle: 'bold',
  tones: ['Professional'],
};

const TERMINAL_STATES = ['pending_review', 'failed'] as const;
const MAX_WAIT_MS = 90_000;

describe('e2e: full pipeline (real kie.ai + Cloud Storage)', () => {
  let user: E2ETestUser;
  let workspaceId: string;
  let batchId = '';

  beforeAll(async () => {
    user = await createTestUser('full');
    const ws = await httpCall({
      method: 'POST', path: '/v1/workspaces',
      idToken: user.idToken, body: { name: 'Full pipeline E2E' },
    });
    workspaceId = ws.body.data.id;
  });

  afterAll(async () => {
    await cleanupWorkspaces(user.uid).catch(() => {});
    await deleteTestUser(user.uid).catch(() => {});
  });

  it('Brief → Batch → Ad with real asset URL', async () => {
    const create = await httpCall({
      method: 'POST', path: '/v1/batches',
      idToken: user.idToken, workspaceId,
      body: { name: 'Full pipeline run', brief },
    });
    expect(create.status).toBe(201);
    batchId = create.body.data.batchId;

    const db = admin.firestore();
    const batchRef = db.doc(`workspaces/${workspaceId}/batches/${batchId}`);

    // Poll for terminal status. 1s tick is fine for a ≤30s expected run.
    const start = Date.now();
    let finalStatus = '';
    while (Date.now() - start < MAX_WAIT_MS) {
      const snap = await batchRef.get();
      const status = snap.data()?.status as string;
      if (TERMINAL_STATES.includes(status as any)) {
        finalStatus = status;
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    expect(finalStatus).toBe('pending_review');

    const batchSnap = await batchRef.get();
    const batchData = batchSnap.data()!;
    expect(batchData.progress.completed).toBe(1);
    expect(batchData.progress.failed).toBe(0);

    const ads = await batchRef.collection('ads').get();
    expect(ads.size).toBe(1);
    const ad = ads.docs[0].data();

    expect(ad.status).toBe('pending');
    expect(ad.headline).toBeTruthy();
    expect(ad.body).toBeTruthy();
    expect(ad.assetPath).toBeTruthy();
    expect(ad.assetPath).toMatch(new RegExp(`^workspaces/${workspaceId}/batches/${batchId}/ads/`));

    // The signed URL endpoint should return a working URL.
    const sig = await httpCall({
      method: 'GET', path: `/v1/assets/${ad.id}/signed-url`,
      idToken: user.idToken, workspaceId,
    });
    expect(sig.status).toBe(200);
    const dl = await fetch(sig.body.data.url);
    expect(dl.status).toBe(200);
    expect(dl.headers.get('content-type')).toMatch(/image/);
  }, MAX_WAIT_MS + 30_000);
});
