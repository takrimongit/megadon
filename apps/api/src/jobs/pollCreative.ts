import { db, bucket } from '../lib/firebase.js';
import { getCreativeProvider } from '../providers/creative.js';
import { enqueueJob } from '../lib/cloudTasks.js';
import { finalizeProgress } from './generateAd.js';
import { finishImageAsset } from './composite.js';

const MAX_ATTEMPTS = 60; // ~30 min at 30s intervals

interface JobPayload {
  workspaceId: string;
  batchId: string;
  adId: string;
  attempt: number;
}

export async function runPollCreative(payload: JobPayload) {
  const { workspaceId, batchId, adId, attempt } = payload;
  const batchRef = db().doc(`workspaces/${workspaceId}/batches/${batchId}`);
  const adRef = batchRef.collection('ads').doc(adId);
  const adSnap = await adRef.get();
  if (!adSnap.exists) return;
  const ad = adSnap.data()!;
  if (!ad.providerJobId) return;

  const provider = getCreativeProvider();
  const status = await provider.pollJob(ad.providerJobId);

  if (status.status === 'pending') {
    if (attempt >= MAX_ATTEMPTS) {
      await adRef.update({
        status: 'failed',
        error: { code: 'PROVIDER_FAILED', message: 'Polling timed out' },
        updatedAt: new Date().toISOString(),
      });
      return;
    }
    await enqueueJob({
      path: '/internal/jobs/poll-creative',
      payload: { ...payload, attempt: attempt + 1 },
      delaySeconds: 10,
    });
    return;
  }

  if (status.status === 'failed') {
    await adRef.update({
      status: 'failed',
      error: { code: 'PROVIDER_FAILED', message: status.error ?? 'Provider failed' },
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  if (!status.assetUrl) return;

  // Re-fetch batch to get brand context, and use the copy already on the ad doc.
  const batchSnap = await batchRef.get();
  const brand = batchSnap.data()?.brandContext ?? null;

  const out = await finishImageAsset(status.assetUrl, brand, { headline: ad.headline, cta: ad.cta });

  const assetPath = `workspaces/${workspaceId}/batches/${batchId}/ads/${adId}/v1.${out.ext}`;
  await bucket().file(assetPath).save(out.buffer, {
    metadata: { contentType: out.contentType },
  });

  await adRef.update({
    assetPath,
    score: 60 + Math.floor(Math.random() * 35),
    status: 'pending',
    updatedAt: new Date().toISOString(),
  });
  await finalizeProgress(batchRef);
}
