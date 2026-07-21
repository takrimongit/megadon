import { db } from '../lib/firebase.js';
import { getVideoProvider } from '../providers/video.js';
import { enqueueJob } from '../lib/cloudTasks.js';
import { finalizeProgress, downloadVideoToStorage } from './generateAd.js';

const MAX_ATTEMPTS = 30; // ~15 min at 30s intervals

interface JobPayload {
  workspaceId: string;
  batchId: string;
  adId: string;
  attempt: number;
}

export async function runPollVideo(payload: JobPayload) {
  const { workspaceId, batchId, adId, attempt } = payload;
  const batchRef = db().doc(`workspaces/${workspaceId}/batches/${batchId}`);
  const adRef = batchRef.collection('ads').doc(adId);
  const adSnap = await adRef.get();
  if (!adSnap.exists) return;
  const ad = adSnap.data()!;
  if (!ad.providerJobId) return;

  const style = (ad.videoStyle ?? 'scenic') as 'scenic' | 'avatar';
  const provider = getVideoProvider(style);
  const status = await provider.pollJob(ad.providerJobId);

  if (status.status === 'pending') {
    if (attempt >= MAX_ATTEMPTS) {
      await adRef.update({
        status: 'failed',
        error: { code: 'PROVIDER_FAILED', message: 'Veo polling timed out' },
        updatedAt: new Date().toISOString(),
      });
      return;
    }
    await enqueueJob({
      path: '/internal/jobs/poll-video',
      payload: { ...payload, attempt: attempt + 1 },
      delaySeconds: 30,
    });
    return;
  }

  if (status.status === 'failed') {
    await adRef.update({
      status: 'failed',
      error: { code: 'PROVIDER_FAILED', message: status.error ?? 'Veo failed' },
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  if (!status.assetUrl) return;

  const brand = (await batchRef.get()).data()?.brandContext ?? null;
  const assetPath = await downloadVideoToStorage(
    status.assetUrl,
    workspaceId,
    batchId,
    adId,
    { copy: { headline: ad.headline, cta: ad.cta }, brand, platform: ad.platform },
  );

  await adRef.update({
    assetPath,
    score: 60 + Math.floor(Math.random() * 35),
    status: 'pending',
    updatedAt: new Date().toISOString(),
  });
  await finalizeProgress(batchRef);
}
