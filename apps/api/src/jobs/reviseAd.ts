import { db } from '../lib/firebase.js';
import { openaiProvider } from '../providers/openai.js';
import type { CopyResult } from '../providers/types.js';

interface JobPayload {
  workspaceId: string;
  adPath: string; // full firestore path to the ad doc
  revisionId: string;
}

export async function runReviseAd(payload: JobPayload) {
  const { adPath, revisionId } = payload;
  const adRef = db().doc(adPath);
  const revRef = adRef.collection('revisions').doc(revisionId);

  const [adSnap, revSnap] = await Promise.all([adRef.get(), revRef.get()]);
  if (!adSnap.exists || !revSnap.exists) return;
  const ad = adSnap.data()!;
  const rev = revSnap.data()!;

  await revRef.update({ status: 'generating' });

  const batchRef = adRef.parent.parent!;
  const batchSnap = await batchRef.get();
  const brief = batchSnap.data()!.brief;

  try {
    const current: CopyResult = {
      headline: ad.headline ?? '',
      body: ad.body ?? '',
      hook: ad.hook ?? '',
      cta: ad.cta ?? '',
    };
    const revised = await openaiProvider.reviseCopy(current, rev.instruction, brief);
    await revRef.update({
      headline: revised.headline,
      body: revised.body,
      cta: revised.cta,
      status: 'ready',
    });
  } catch (err) {
    await revRef.update({
      status: 'failed',
      error: { code: 'PROVIDER_FAILED', message: (err as Error).message },
    });
  }
}
