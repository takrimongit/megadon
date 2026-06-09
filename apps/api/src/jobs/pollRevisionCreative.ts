import { db, bucket } from '../lib/firebase.js';
import { getCreativeProvider } from '../providers/creative.js';
import { enqueueJob } from '../lib/cloudTasks.js';
import { compositeBrandOverlay, fetchBrandLogo } from './composite.js';

const MAX_ATTEMPTS = 60; // ~30 min at 30s intervals

interface JobPayload {
  workspaceId: string;
  batchId: string;
  adId: string;
  revisionId: string;
  attempt: number;
}

export async function runPollRevisionCreative(payload: JobPayload) {
  const { workspaceId, batchId, adId, revisionId, attempt } = payload;
  const adSnap = await db()
    .collectionGroup('ads')
    .where('id', '==', adId)
    .where('workspaceId', '==', workspaceId)
    .limit(1)
    .get();
  if (adSnap.empty) return;
  const adRef = adSnap.docs[0].ref;
  const revRef = adRef.collection('revisions').doc(revisionId);
  const revSnap = await revRef.get();
  if (!revSnap.exists) return;
  const rev = revSnap.data()!;
  if (!rev.providerJobId) return;
  if (rev.status === 'ready' || rev.status === 'failed') return;

  const provider = getCreativeProvider();
  const status = await provider.pollJob(rev.providerJobId);

  if (status.status === 'pending') {
    if (attempt >= MAX_ATTEMPTS) {
      await revRef.update({
        status: 'failed',
        error: { code: 'PROVIDER_FAILED', message: 'Polling timed out' },
      });
      return;
    }
    await enqueueJob({
      path: '/internal/jobs/poll-revision-creative',
      payload: { ...payload, attempt: attempt + 1 },
      delaySeconds: 10,
    });
    return;
  }

  if (status.status === 'failed') {
    await revRef.update({
      status: 'failed',
      error: { code: 'PROVIDER_FAILED', message: status.error ?? 'Provider failed' },
    });
    return;
  }

  if (!status.assetUrl) return;
  const assetPath = await downloadRevisionAsset(
    status.assetUrl,
    workspaceId,
    batchId,
    adId,
    revisionId,
  );
  await revRef.update({ assetPath, status: 'ready' });
}

export async function downloadRevisionAsset(
  url: string,
  workspaceId: string,
  batchId: string,
  adId: string,
  revisionId: string,
): Promise<string> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Asset download failed: ${resp.status}`);
  const bgBuf = Buffer.from(await resp.arrayBuffer());

  // Re-fetch batch + revision to access brand + revised copy for compositing.
  const batchSnap = await db().doc(`workspaces/${workspaceId}/batches/${batchId}`).get();
  const brand = batchSnap.data()?.brandContext ?? null;
  const logo = await fetchBrandLogo(brand);

  // The revision doc holds the new copy. Look it up via collectionGroup
  // to avoid having to plumb adPath through every caller.
  const adSnap = await db()
    .collectionGroup('ads')
    .where('id', '==', adId)
    .where('workspaceId', '==', workspaceId)
    .limit(1)
    .get();
  let revHeadline = '';
  let revCta = '';
  if (!adSnap.empty) {
    const revSnap = await adSnap.docs[0].ref.collection('revisions').doc(revisionId).get();
    revHeadline = revSnap.data()?.headline ?? '';
    revCta = revSnap.data()?.cta ?? '';
  }

  const out = await compositeBrandOverlay({
    background: bgBuf,
    brand,
    logo,
    copy: { headline: revHeadline, cta: revCta },
  });

  const path = `workspaces/${workspaceId}/batches/${batchId}/ads/${adId}/rev-${revisionId}.${out.ext}`;
  await bucket().file(path).save(out.buffer, {
    metadata: { contentType: out.contentType },
  });
  return path;
}
