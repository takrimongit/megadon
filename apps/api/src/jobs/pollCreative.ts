import { db } from '../lib/firebase.js';
import { getCreativeProvider } from '../providers/creative.js';
import { enqueueJob } from '../lib/cloudTasks.js';
import { downloadToStorage, finalizeProgress } from './generateAd.js';

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
  const assetPath = await downloadToStorage(status.assetUrl, workspaceId, batchId, adId);
  await adRef.update({
    assetPath,
    score: 60 + Math.floor(Math.random() * 35),
    status: 'pending',
    updatedAt: new Date().toISOString(),
  });
  await finalizeProgress(batchRef);
}
