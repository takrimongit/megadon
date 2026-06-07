import { db, bucket } from '../lib/firebase.js';
import { getCreativeProvider } from '../providers/creative.js';
import { enqueueJob } from '../lib/cloudTasks.js';

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
  const buf = Buffer.from(await resp.arrayBuffer());
  const ext = url.split('.').pop()?.split('?')[0] ?? 'jpg';
  const path = `workspaces/${workspaceId}/batches/${batchId}/ads/${adId}/rev-${revisionId}.${ext}`;
  await bucket().file(path).save(buf, {
    metadata: { contentType: resp.headers.get('content-type') ?? 'image/jpeg' },
  });
  return path;
}
