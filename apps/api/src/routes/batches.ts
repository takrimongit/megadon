import type { FastifyInstance } from 'fastify';
import { db, FieldValue } from '../lib/firebase.js';
import { requireAuth, requireWorkspace } from '../middleware/auth.js';
import { ok } from '../lib/envelope.js';
import { AppError } from '../lib/errors.js';
import { enqueueJob } from '../lib/cloudTasks.js';
import { CreateBatchBody, BulkDecisionsBody, type Brief, type Platform } from '@megadon/types';

const FORMATS_BY_PLATFORM: Record<Platform, string[]> = {
  instagram: ['Reel', 'Story', 'Feed'],
  tiktok: ['Short'],
  facebook: ['Feed', 'Story'],
  youtube: ['Short'],
  linkedin: ['Feed'],
};

function distributePlatforms(brief: Brief): { platform: Platform; format: string }[] {
  const out: { platform: Platform; format: string }[] = [];
  for (let i = 0; i < brief.batchSize; i++) {
    const platform = brief.platforms[i % brief.platforms.length];
    const formats = FORMATS_BY_PLATFORM[platform];
    const format = formats[i % formats.length];
    out.push({ platform, format });
  }
  return out;
}

export async function batchRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireWorkspace);

  // Create batch + enqueue generation
  app.post('/batches', async (req, reply) => {
    const body = CreateBatchBody.parse(req.body);
    const { id: workspaceId } = req.workspace!;
    const uid = req.user!.uid;
    const now = new Date().toISOString();

    const batchRef = db().collection(`workspaces/${workspaceId}/batches`).doc();
    const slots = distributePlatforms(body.brief);

    // Snapshot the approved brand playbook (if any) so generation has stable
    // brand context even if the playbook changes later.
    const playbookSnap = await db().doc(`workspaces/${workspaceId}/brandPlaybook/current`).get();
    const playbook = playbookSnap.exists ? playbookSnap.data() : null;
    const brandContext = playbook?.status === 'approved'
      ? { info: playbook.info, analysis: playbook.analysis, assets: playbook.assets ?? [] }
      : null;

    // Create batch + placeholder ads in a single batched write.
    const writer = db().batch();
    writer.set(batchRef, {
      id: batchRef.id,
      workspaceId,
      name: body.name,
      status: 'queued',
      brief: body.brief,
      brandContext,
      progress: { total: body.brief.batchSize, completed: 0, failed: 0 },
      counters: { approved: 0, rejected: 0 },
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
    });

    const adRefs = slots.map(({ platform, format }) => {
      const adRef = batchRef.collection('ads').doc();
      writer.set(adRef, {
        id: adRef.id,
        batchId: batchRef.id,
        workspaceId,
        platform,
        format,
        status: 'generating',
        history: [],
        createdAt: now,
        updatedAt: now,
      });
      return adRef;
    });

    await writer.commit();

    // Enqueue per-ad jobs.
    await Promise.all(
      adRefs.map((ref) =>
        enqueueJob({
          path: '/internal/jobs/generate-ad',
          payload: { workspaceId, batchId: batchRef.id, adId: ref.id },
        })
      )
    );

    return ok(reply, {
      batchId: batchRef.id,
      estimatedSeconds: Math.max(60, body.brief.batchSize * 8),
    }, 201);
  });

  // Bulk approve/reject
  app.post('/batches/:batchId/decisions', async (req, reply) => {
    const { batchId } = req.params as { batchId: string };
    const body = BulkDecisionsBody.parse(req.body);
    const { id: workspaceId } = req.workspace!;

    const batchRef = db().doc(`workspaces/${workspaceId}/batches/${batchId}`);

    await db().runTransaction(async (tx) => {
      const batchSnap = await tx.get(batchRef);
      if (!batchSnap.exists) throw AppError.notFound('Batch not found');

      let approved = 0;
      let rejected = 0;

      for (const dec of body.decisions) {
        const adRef = batchRef.collection('ads').doc(dec.adId);
        tx.update(adRef, {
          status: dec.status,
          updatedAt: new Date().toISOString(),
        });
        if (dec.status === 'approved') approved++;
        else rejected++;
      }

      const data = batchSnap.data()!;
      const newApproved = (data.counters?.approved ?? 0) + approved;
      const newRejected = (data.counters?.rejected ?? 0) + rejected;
      const total = data.progress.total;

      const update: any = {
        'counters.approved': newApproved,
        'counters.rejected': newRejected,
        updatedAt: new Date().toISOString(),
      };
      if (newApproved + newRejected >= total) {
        update.status = newApproved > 0 ? 'approved' : 'archived';
      }
      tx.update(batchRef, update);
    });

    return ok(reply, { ok: true });
  });
}
