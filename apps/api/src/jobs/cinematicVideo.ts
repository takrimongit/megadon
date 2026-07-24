// Cinematic video job: a chained state machine on the ad doc.
//   storyboard → nano-banana image → Veo i2v (8s) → extend ×(target-1) → store.
// Each Veo extend returns the FULL cumulative video (kie joins the beats), so the
// final task's URL is the complete ~48-64s video — no concat needed. Sequential
// (each extend needs the prior taskId), so it runs long (~10-16 min) and re-enqueues.

import { db, FieldValue } from '../lib/firebase.js';
import { enqueueJob } from '../lib/cloudTasks.js';
import { config } from '../lib/config.js';
import { generateStoryboard } from '../providers/kie.js';
import { startSceneImage, pollImage, startVeoI2V, extendVeo, pollVeo } from '../providers/cinematic.js';
import { downloadVideoToStorage, finalizeProgress } from './generateAd.js';
import type { Brief, Platform } from '@megadon/types';
import type { CopyResult, BrandContext } from '../providers/types.js';

const MAX_ATTEMPTS = 90; // ~30 min at 20s intervals (cinematic runs ~10-16 min)

interface CinematicState {
  stage: 'image' | 'video';
  segments: string[]; // [0] = i2v prompt, [1..] = extend prompts
  target: number; // total video segments
  done: number; // segments completed
  imageTaskId?: string;
  imageUrl?: string;
  veoTaskId?: string;
}

/** Storyboard + kick off the nano-banana scene image, then poll-cinematic drives the chain. */
export async function startCinematicVideo(
  workspaceId: string, batchId: string, adId: string,
  brief: Brief, platform: Platform, copy: CopyResult, brand: BrandContext | null,
): Promise<void> {
  const target = Math.max(2, config.cinematicSegments);
  const { imagePrompt, segments } = await generateStoryboard(brief, platform, brand, copy, target);
  const imageTaskId = await startSceneImage(imagePrompt, platform);
  const cinematic: CinematicState = { stage: 'image', segments, target, done: 0, imageTaskId };
  const adRef = db().doc(`workspaces/${workspaceId}/batches/${batchId}/ads/${adId}`);
  await adRef.update({ cinematic, ...copy, updatedAt: new Date().toISOString() });
  await enqueueJob({ path: '/internal/jobs/poll-cinematic', payload: { workspaceId, batchId, adId, attempt: 1 }, delaySeconds: 15 });
}

interface PollPayload { workspaceId: string; batchId: string; adId: string; attempt: number }

export async function runPollCinematic(payload: PollPayload): Promise<void> {
  const { workspaceId, batchId, adId, attempt } = payload;
  const batchRef = db().doc(`workspaces/${workspaceId}/batches/${batchId}`);
  const adRef = batchRef.collection('ads').doc(adId);
  const snap = await adRef.get();
  if (!snap.exists) return;
  const ad = snap.data()!;
  const c = ad.cinematic as CinematicState | undefined;
  if (!c) return;
  const platform = (ad.platform as Platform) ?? 'instagram';

  const fail = async (message: string) => {
    await adRef.update({ status: 'failed', error: { code: 'PROVIDER_FAILED', message }, updatedAt: new Date().toISOString() });
    await bumpFailed(batchRef);
  };
  const reenqueue = async (patch?: Partial<CinematicState>) => {
    if (patch) await adRef.update({ cinematic: { ...c, ...patch }, updatedAt: new Date().toISOString() });
    if (attempt >= MAX_ATTEMPTS) return fail('Cinematic polling timed out');
    await enqueueJob({ path: '/internal/jobs/poll-cinematic', payload: { ...payload, attempt: attempt + 1 }, delaySeconds: 20 });
  };

  try {
    if (c.stage === 'image') {
      const r = await pollImage(c.imageTaskId!);
      if (r.status === 'failed') return void (await fail(`scene image: ${r.error}`));
      if (r.status === 'pending') return void (await reenqueue());
      const veoTaskId = await startVeoI2V(r.url!, c.segments[0], platform);
      return void (await reenqueue({ stage: 'video', imageUrl: r.url, veoTaskId, done: 0 }));
    }

    // stage 'video' — a Veo i2v or extend is in flight.
    const r = await pollVeo(c.veoTaskId!);
    if (r.status === 'failed') return void (await fail(`veo: ${r.error}`));
    if (r.status === 'pending') return void (await reenqueue());

    const done = c.done + 1;
    if (done < c.target) {
      const next = await extendVeo(c.veoTaskId!, c.segments[done]);
      return void (await reenqueue({ veoTaskId: next, done }));
    }

    // Final cumulative video is ready.
    const assetPath = await downloadVideoToStorage(r.url!, workspaceId, batchId, adId);
    await adRef.update({
      assetPath, cinematic: FieldValue.delete(),
      score: 60 + Math.floor(Math.random() * 35), status: 'pending', updatedAt: new Date().toISOString(),
    });
    await finalizeProgress(batchRef);
  } catch (err) {
    await fail((err as Error).message);
  }
}

async function bumpFailed(batchRef: FirebaseFirestore.DocumentReference): Promise<void> {
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(batchRef);
    if (!snap.exists) return;
    const data = snap.data()!;
    const failed = (data.progress?.failed ?? 0) + 1;
    const completed = data.progress?.completed ?? 0;
    const update: Record<string, unknown> = { 'progress.failed': failed, updatedAt: new Date().toISOString() };
    if (completed + failed >= data.progress.total) update.status = completed > 0 ? 'pending_review' : 'failed';
    tx.update(batchRef, update);
  });
}
