import type { FastifyInstance } from 'fastify';
import { db, bucket } from '../lib/firebase.js';
import { requireAuth, requireWorkspace } from '../middleware/auth.js';
import { ok } from '../lib/envelope.js';
import { AppError } from '../lib/errors.js';
import { enqueueJob } from '../lib/cloudTasks.js';
import { UpdateAdBody, CreateRevisionBody, PublishAdBody } from '@megadon/types';

async function findAd(workspaceId: string, adId: string) {
  const snap = await db()
    .collectionGroup('ads')
    .where('id', '==', adId)
    .where('workspaceId', '==', workspaceId)
    .limit(1)
    .get();
  if (snap.empty) throw AppError.notFound('Ad not found');
  return snap.docs[0];
}

export async function adRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireWorkspace);

  // Single approve / reject (rapid review)
  app.patch('/ads/:adId', async (req, reply) => {
    const { adId } = req.params as { adId: string };
    const body = UpdateAdBody.parse(req.body);
    const { id: workspaceId } = req.workspace!;

    const adDoc = await findAd(workspaceId, adId);
    const batchRef = adDoc.ref.parent.parent!;

    await db().runTransaction(async (tx) => {
      const batchSnap = await tx.get(batchRef);
      if (!batchSnap.exists) throw AppError.notFound('Batch not found');
      tx.update(adDoc.ref, { status: body.status, updatedAt: new Date().toISOString() });

      const data = batchSnap.data()!;
      const newApproved = (data.counters?.approved ?? 0) + (body.status === 'approved' ? 1 : 0);
      const newRejected = (data.counters?.rejected ?? 0) + (body.status === 'rejected' ? 1 : 0);
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

  // Request AI revision
  app.post('/ads/:adId/revisions', async (req, reply) => {
    const { adId } = req.params as { adId: string };
    const body = CreateRevisionBody.parse(req.body);
    const { id: workspaceId } = req.workspace!;
    const uid = req.user!.uid;

    const adDoc = await findAd(workspaceId, adId);
    const revRef = adDoc.ref.collection('revisions').doc();
    await revRef.set({
      id: revRef.id,
      adId,
      instruction: body.instruction,
      status: 'queued',
      accepted: false,
      createdBy: uid,
      createdAt: new Date().toISOString(),
    });

    await enqueueJob({
      path: '/internal/jobs/revise-ad',
      payload: {
        workspaceId,
        batchId: adDoc.ref.parent.parent!.id,
        adId,
        adPath: adDoc.ref.path,
        revisionId: revRef.id,
      },
    });

    return ok(reply, { revisionId: revRef.id }, 201);
  });

  // Signed read URL for a revision's regenerated asset
  app.get('/ads/:adId/revisions/:rid/signed-url', async (req, reply) => {
    const { adId, rid } = req.params as { adId: string; rid: string };
    const { id: workspaceId } = req.workspace!;

    const adDoc = await findAd(workspaceId, adId);
    const revSnap = await adDoc.ref.collection('revisions').doc(rid).get();
    if (!revSnap.exists) throw AppError.notFound('Revision not found');
    const { assetPath } = revSnap.data()!;
    if (!assetPath) throw AppError.notFound('Revision asset not generated yet');

    const [url] = await bucket().file(assetPath).getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000,
    });
    return ok(reply, { url, expiresIn: 900 });
  });

  // Accept revision
  app.post('/ads/:adId/revisions/:rid/accept', async (req, reply) => {
    const { adId, rid } = req.params as { adId: string; rid: string };
    const { id: workspaceId } = req.workspace!;

    const adDoc = await findAd(workspaceId, adId);
    const revRef = adDoc.ref.collection('revisions').doc(rid);

    await db().runTransaction(async (tx) => {
      const [adSnap, revSnap] = await Promise.all([tx.get(adDoc.ref), tx.get(revRef)]);
      if (!adSnap.exists || !revSnap.exists) throw AppError.notFound();
      const ad = adSnap.data()!;
      const rev = revSnap.data()!;
      if (rev.status !== 'ready') throw AppError.validation('Revision not ready');

      const history = ad.history ?? [];
      history.push({
        headline: ad.headline,
        body: ad.body,
        cta: ad.cta,
        assetPath: ad.assetPath,
        revisedAt: new Date().toISOString(),
      });

      const update: Record<string, unknown> = {
        headline: rev.headline,
        body: rev.body,
        cta: rev.cta,
        status: 'approved',
        history,
        updatedAt: new Date().toISOString(),
      };
      if (rev.assetPath) update.assetPath = rev.assetPath;

      tx.update(adDoc.ref, update);
      tx.update(revRef, { accepted: true });
    });

    return ok(reply, { ok: true });
  });

  // Publish an approved ad to Facebook Page / Instagram (organic).
  app.post('/ads/:adId/publish', async (req, reply) => {
    const { adId } = req.params as { adId: string };
    const body = PublishAdBody.parse(req.body);
    const { id: workspaceId } = req.workspace!;
    const uid = req.user!.uid;

    const adDoc = await findAd(workspaceId, adId);
    const ad = adDoc.data();
    if (ad.status !== 'approved') throw AppError.validation('Only approved ads can be published');
    if (!ad.assetPath) throw AppError.validation('Ad has no generated asset yet');

    await adDoc.ref.update({
      publish: {
        status: 'publishing',
        targets: [],
        requestedBy: uid,
        updatedAt: new Date().toISOString(),
      },
    });

    await enqueueJob({
      path: '/internal/jobs/publish-ad',
      payload: {
        workspaceId,
        batchId: adDoc.ref.parent.parent!.id,
        adId,
        targets: body.targets,
        requestedBy: uid,
      },
    });

    return ok(reply, { ok: true, status: 'publishing' }, 202);
  });
}
