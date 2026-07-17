import { db } from '../lib/firebase.js';
import { kieProvider } from '../providers/kie.js';
import { getCreativeProvider } from '../providers/creative.js';
import { enqueueJob } from '../lib/cloudTasks.js';
import { downloadRevisionAsset } from './pollRevisionCreative.js';
import { loadGeekSettings, pickChat, pickMedia } from '../lib/geekSettings.js';
import { recordUsage, resolveModel } from '../lib/usage.js';
import { config } from '../lib/config.js';
import type { CopyResult } from '../providers/types.js';
import type { Platform } from '@megadon/types';

interface JobPayload {
  workspaceId: string;
  batchId: string;
  adId: string;
  adPath: string; // full firestore path to the ad doc
  revisionId: string;
}

export async function runReviseAd(payload: JobPayload) {
  const { workspaceId, adPath, revisionId } = payload;
  const adRef = db().doc(adPath);
  const revRef = adRef.collection('revisions').doc(revisionId);

  const [adSnap, revSnap] = await Promise.all([adRef.get(), revRef.get()]);
  if (!adSnap.exists || !revSnap.exists) return;
  const ad = adSnap.data()!;
  const rev = revSnap.data()!;

  await revRef.update({ status: 'generating' });

  const batchRef = adRef.parent.parent!;
  const batchId = batchRef.id;
  const batchSnap = await batchRef.get();
  const batchData = batchSnap.data()!;
  const brief = batchData.brief;
  const brand = batchData.brandContext ?? null;

  try {
    // 1. Revise copy — pass brand so tone/rules/personality are preserved.
    const current: CopyResult = {
      headline: ad.headline ?? '',
      body: ad.body ?? '',
      hook: ad.hook ?? '',
      cta: ad.cta ?? '',
    };
    const geek = await loadGeekSettings(workspaceId);
    const reviseOverride = pickChat(geek, 'revise');
    const revised = await kieProvider.reviseCopy(
      current, rev.instruction, brief, brand, reviseOverride,
    );
    void recordUsage({
      workspaceId, batchId, adId: ad.id, surface: 'revise',
      model: resolveModel(reviseOverride, config.kieChatModel),
    });
    await revRef.update({
      headline: revised.headline,
      body: revised.body,
      cta: revised.cta,
    });

    // 2. Regenerate creative. The prompt builder bakes in palette + brand
    // identity again, plus the user's revision note as a final directive,
    // so the new image stays on-brand.
    const provider = getCreativeProvider();
    const platform = (ad.platform as Platform) ?? 'facebook';
    // For revision creative we always go through the image provider (the
    // user revises one ad at a time — video revisions would need their
    // own UI flow and worker; out of scope for now).
    const imageOverride = pickMedia(geek, 'image');
    const kickoff = await provider.kickoff(brief, platform, revised, brand, {
      revisionInstruction: rev.instruction,
      override: imageOverride,
      creativeDirection: ad.creativeDirection,
    });
    void recordUsage({
      workspaceId, batchId, adId: ad.id, surface: 'image',
      model: resolveModel(imageOverride, config.kieImageModel),
    });

    if (kickoff.jobId && !kickoff.assetUrl) {
      // Async — store provider job id, enqueue poll.
      await revRef.update({ providerJobId: kickoff.jobId });
      await enqueueJob({
        path: '/internal/jobs/poll-revision-creative',
        payload: { workspaceId, batchId, adId: ad.id, revisionId, attempt: 1 },
        delaySeconds: 10,
      });
      return;
    }

    if (!kickoff.assetUrl) throw new Error('Provider returned neither asset nor job id');

    // Sync — download and finalize.
    const assetPath = await downloadRevisionAsset(
      kickoff.assetUrl,
      workspaceId,
      batchId,
      ad.id,
      revisionId,
    );
    await revRef.update({ assetPath, status: 'ready' });
  } catch (err) {
    await revRef.update({
      status: 'failed',
      error: { code: 'PROVIDER_FAILED', message: (err as Error).message },
    });
  }
}
