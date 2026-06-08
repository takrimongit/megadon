import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { db, bucket } from '../lib/firebase.js';
import { requireAuth, requireWorkspace } from '../middleware/auth.js';
import { ok } from '../lib/envelope.js';
import { AppError } from '../lib/errors.js';
import { enqueueJob } from '../lib/cloudTasks.js';
import {
  UpdateBrandInfoBody,
  RequestUploadUrlBody,
  RegisterAssetBody,
  UpdatePlaybookBody,
  type BrandPlaybook,
  type BrandAsset,
} from '@megadon/types';

const playbookRef = (workspaceId: string) =>
  db().doc(`workspaces/${workspaceId}/brandPlaybook/current`);

const EMPTY_ANALYSIS = {
  colors: [],
  personality: [],
  toneOfVoice: '',
  visualStyle: '',
  targetAudience: '',
  creativeStyles: [],
  brandRules: [],
  messagingStyle: '',
  ctaPreferences: [],
  confidence: { colors: 0, personality: 0, toneOfVoice: 0, visualStyle: 0, audience: 0 },
};

async function loadOrInit(workspaceId: string): Promise<BrandPlaybook> {
  const ref = playbookRef(workspaceId);
  const snap = await ref.get();
  if (snap.exists) return snap.data() as BrandPlaybook;
  const now = new Date().toISOString();
  const seed: BrandPlaybook = {
    workspaceId,
    status: 'empty',
    info: null,
    assets: [],
    analysis: null,
    createdAt: now,
    updatedAt: now,
    approvedAt: null,
  };
  await ref.set(seed);
  return seed;
}

export async function brandRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireWorkspace);

  // GET current playbook (auto-creates empty if absent)
  app.get('/brand/playbook', async (req, reply) => {
    const playbook = await loadOrInit(req.workspace!.id);
    return ok(reply, playbook);
  });

  // PUT brand info (step 2)
  app.put('/brand/info', async (req, reply) => {
    const body = UpdateBrandInfoBody.parse(req.body);
    const ref = playbookRef(req.workspace!.id);
    await loadOrInit(req.workspace!.id);
    await ref.set(
      {
        info: body,
        status: 'draft',
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    const snap = await ref.get();
    return ok(reply, snap.data());
  });

  // POST signed-upload URL — mobile PUTs the file to this URL directly
  app.post('/brand/assets/signed-upload', async (req, reply) => {
    const body = RequestUploadUrlBody.parse(req.body);
    const assetId = randomUUID();
    const wid = req.workspace!.id;
    const ext = body.mimeType.split('/')[1] ?? 'bin';
    const path = `workspaces/${wid}/brand/${body.type}/${assetId}.${ext}`;
    const file = bucket().file(path);
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
      contentType: body.mimeType,
    });
    return ok(reply, { url, assetPath: path, assetId, expiresIn: 900 });
  });

  // POST register asset (after successful PUT)
  app.post('/brand/assets/register', async (req, reply) => {
    const body = RegisterAssetBody.parse(req.body);
    const ref = playbookRef(req.workspace!.id);
    await loadOrInit(req.workspace!.id);
    const asset: BrandAsset = {
      id: randomUUID(),
      type: body.type,
      path: body.path,
      mimeType: body.mimeType,
      filename: body.filename,
      uploadedAt: new Date().toISOString(),
    };
    await db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const existing = (snap.data() as BrandPlaybook | undefined)?.assets ?? [];
      tx.update(ref, {
        assets: [...existing, asset],
        status: 'draft',
        updatedAt: new Date().toISOString(),
      });
    });
    return ok(reply, asset, 201);
  });

  // DELETE asset by id
  app.delete('/brand/assets/:assetId', async (req, reply) => {
    const { assetId } = req.params as { assetId: string };
    const ref = playbookRef(req.workspace!.id);
    await db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw AppError.notFound();
      const data = snap.data() as BrandPlaybook;
      const removed = data.assets.find((a) => a.id === assetId);
      if (!removed) throw AppError.notFound('Asset not found');
      tx.update(ref, {
        assets: data.assets.filter((a) => a.id !== assetId),
        updatedAt: new Date().toISOString(),
      });
      // Best-effort GCS cleanup happens outside the txn.
      void bucket().file(removed.path).delete().catch(() => {});
    });
    return ok(reply, { ok: true });
  });

  // POST kick off analysis
  app.post('/brand/analyze', async (req, reply) => {
    const wid = req.workspace!.id;
    const ref = playbookRef(wid);
    const snap = await ref.get();
    if (!snap.exists) throw AppError.validation('No playbook to analyze');
    const data = snap.data() as BrandPlaybook;
    if (!data.info) throw AppError.validation('Brand info required before analysis');

    await ref.update({
      status: 'analyzing',
      analysis: data.analysis ?? EMPTY_ANALYSIS,
      updatedAt: new Date().toISOString(),
    });
    await enqueueJob({
      path: '/internal/jobs/analyze-brand',
      payload: { workspaceId: wid },
    });
    return ok(reply, { ok: true, estimatedSeconds: 30 });
  });

  // PATCH editable fields (step 5)
  app.patch('/brand/playbook', async (req, reply) => {
    const body = UpdatePlaybookBody.parse(req.body);
    const ref = playbookRef(req.workspace!.id);
    const snap = await ref.get();
    if (!snap.exists) throw AppError.notFound();
    const current = snap.data() as BrandPlaybook;
    const merged = {
      ...current,
      analysis: { ...(current.analysis ?? EMPTY_ANALYSIS), ...(body.analysis ?? {}) },
      updatedAt: new Date().toISOString(),
    };
    await ref.set(merged);
    return ok(reply, merged);
  });

  // POST approve (complete onboarding)
  app.post('/brand/playbook/approve', async (req, reply) => {
    const ref = playbookRef(req.workspace!.id);
    const snap = await ref.get();
    if (!snap.exists) throw AppError.notFound();
    const data = snap.data() as BrandPlaybook;
    if (!data.analysis) throw AppError.validation('Analysis must complete before approval');
    const now = new Date().toISOString();
    await ref.update({ status: 'approved', approvedAt: now, updatedAt: now });
    return ok(reply, { ok: true });
  });
}

export { playbookRef };
