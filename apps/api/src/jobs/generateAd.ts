import { db, bucket, FieldValue } from '../lib/firebase.js';
import { kieProvider } from '../providers/kie.js';
import { getCreativeProvider } from '../providers/creative.js';
import { enqueueJob } from '../lib/cloudTasks.js';
import { compositeBrandOverlay, fetchBrandLogo } from './composite.js';
import type { BrandContext, CopyResult } from '../providers/types.js';
import type { Brief, Platform } from '@megadon/types';

interface JobPayload {
  workspaceId: string;
  batchId: string;
  adId: string;
}

export async function runGenerateAd(payload: JobPayload) {
  const { workspaceId, batchId, adId } = payload;
  const batchRef = db().doc(`workspaces/${workspaceId}/batches/${batchId}`);
  const adRef = batchRef.collection('ads').doc(adId);

  const [batchSnap, adSnap] = await Promise.all([batchRef.get(), adRef.get()]);
  if (!batchSnap.exists || !adSnap.exists) throw new Error('Batch or ad missing');
  const batchData = batchSnap.data()!;
  const brief: Brief = batchData.brief;
  const brandContext = batchData.brandContext ?? null;
  const ad = adSnap.data()!;

  // Merge brand context into the brief if available.
  const effectiveBrief: Brief = brandContext?.analysis
    ? {
        ...brief,
        creativeStyle: brief.creativeStyle,
        tones: brief.tones && brief.tones.length > 0
          ? brief.tones
          : (brandContext.analysis.toneOfVoice ? [brandContext.analysis.toneOfVoice] : brief.tones),
      }
    : brief;

  try {
    // 1. Flip batch into 'generating' on first ad.
    if (batchSnap.data()!.status === 'queued') {
      await batchRef.update({ status: 'generating', updatedAt: new Date().toISOString() });
    }

    // 2. Copy generation.
    const copy = await kieProvider.generateCopy(effectiveBrief, ad.platform as Platform, brandContext);

    // 3. Creative generation.
    const provider = getCreativeProvider();
    const kickoff = await provider.kickoff(effectiveBrief, ad.platform as Platform, copy, brandContext);

    if (kickoff.jobId && !kickoff.assetUrl) {
      // Async — persist job id, enqueue delayed poll.
      await adRef.update({
        providerJobId: kickoff.jobId,
        ...copy,
        updatedAt: new Date().toISOString(),
      });
      await enqueueJob({
        path: '/internal/jobs/poll-creative',
        payload: { workspaceId, batchId, adId, attempt: 1 },
        delaySeconds: 10,
      });
      return;
    }

    if (!kickoff.assetUrl) throw new Error('Provider returned neither asset nor job id');

    // 4. Download, composite brand overlay, upload.
    const assetPath = await downloadAndComposite(
      kickoff.assetUrl,
      workspaceId,
      batchId,
      adId,
      copy,
      brandContext,
    );

    // 5. Patch ad doc.
    await adRef.update({
      ...copy,
      assetPath,
      score: 60 + Math.floor(Math.random() * 35),
      status: 'pending',
      updatedAt: new Date().toISOString(),
    });

    // 6. Increment batch progress, finalize if done.
    await finalizeProgress(batchRef);
  } catch (err) {
    const message = (err as Error).message;
    await adRef.update({
      status: 'failed',
      error: { code: 'PROVIDER_FAILED', message },
      updatedAt: new Date().toISOString(),
    });
    await db().runTransaction(async (tx) => {
      const snap = await tx.get(batchRef);
      if (!snap.exists) return;
      const data = snap.data()!;
      const failed = (data.progress?.failed ?? 0) + 1;
      const completed = data.progress?.completed ?? 0;
      const update: any = { 'progress.failed': failed, updatedAt: new Date().toISOString() };
      if (completed + failed >= data.progress.total) {
        update.status = completed > 0 ? 'pending_review' : 'failed';
      }
      tx.update(batchRef, update);
    });
    throw err;
  }
}

/**
 * Downloads the FLUX-generated background, composites the brand logo +
 * headline + CTA on top, and stores the result. Returns the GCS path.
 */
async function downloadAndComposite(
  url: string,
  workspaceId: string,
  batchId: string,
  adId: string,
  copy: CopyResult,
  brand?: BrandContext | null,
): Promise<string> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Asset download failed: ${resp.status}`);
  const bgBuf = Buffer.from(await resp.arrayBuffer());

  const logo = await fetchBrandLogo(brand);
  const out = await compositeBrandOverlay({
    background: bgBuf,
    brand,
    logo,
    copy,
  });

  const path = `workspaces/${workspaceId}/batches/${batchId}/ads/${adId}/v1.${out.ext}`;
  await bucket().file(path).save(out.buffer, {
    metadata: { contentType: out.contentType },
  });
  return path;
}

// Kept as a re-export for callers that want raw download (pollCreative
// re-exports it but now also composites internally).
async function downloadToStorage(
  url: string,
  workspaceId: string,
  batchId: string,
  adId: string,
): Promise<string> {
  return downloadAndComposite(url, workspaceId, batchId, adId, {
    headline: '', body: '', hook: '', cta: '',
  }, null);
}

async function finalizeProgress(batchRef: FirebaseFirestore.DocumentReference) {
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(batchRef);
    if (!snap.exists) return;
    const data = snap.data()!;
    const completed = (data.progress?.completed ?? 0) + 1;
    const failed = data.progress?.failed ?? 0;
    const update: any = { 'progress.completed': completed, updatedAt: new Date().toISOString() };
    if (completed + failed >= data.progress.total) {
      update.status = 'pending_review';
    }
    tx.update(batchRef, update);
  });
}

export { downloadToStorage, finalizeProgress };
