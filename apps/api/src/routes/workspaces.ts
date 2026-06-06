import type { FastifyInstance } from 'fastify';
import { db, FieldValue } from '../lib/firebase.js';
import { requireAuth, requireWorkspace, requireRole } from '../middleware/auth.js';
import { ok } from '../lib/envelope.js';
import { AppError } from '../lib/errors.js';
import { CreateWorkspaceBody, type Workspace } from '@megadon/types';

export async function workspaceRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  // Create workspace
  app.post('/workspaces', async (req, reply) => {
    const body = CreateWorkspaceBody.parse(req.body);
    const uid = req.user!.uid;
    const now = new Date().toISOString();

    const ref = db().collection('workspaces').doc();
    await db().runTransaction(async (tx) => {
      tx.set(ref, {
        name: body.name,
        ownerId: uid,
        plan: 'free',
        createdAt: now,
      });
      tx.set(ref.collection('members').doc(uid), {
        role: 'owner',
        addedAt: now,
      });
      // Bootstrap user defaultWorkspaceId if missing
      const userRef = db().doc(`users/${uid}`);
      tx.set(userRef, {
        uid,
        email: req.user!.email,
        defaultWorkspaceId: ref.id,
        createdAt: now,
      }, { merge: true });
    });

    const ws: Workspace = {
      id: ref.id,
      name: body.name,
      ownerId: uid,
      plan: 'free',
      createdAt: now,
    };
    return ok(reply, ws, 201);
  });

  // List my workspaces (via membership lookup)
  app.get('/workspaces', async (req, reply) => {
    const uid = req.user!.uid;
    const memberships = await db().collectionGroup('members').where('uid', '==', uid).get();
    // Note: we store role on the doc but uid is the doc id. Use parent path instead.
    const ids = new Set<string>();
    const all = await db().collectionGroup('members').get();
    all.forEach((doc) => {
      if (doc.id === uid) {
        const wid = doc.ref.parent.parent?.id;
        if (wid) ids.add(wid);
      }
    });
    const workspaces = await Promise.all(
      Array.from(ids).map(async (id) => {
        const snap = await db().doc(`workspaces/${id}`).get();
        return snap.exists ? { id, ...snap.data() } as Workspace : null;
      })
    );
    return ok(reply, workspaces.filter(Boolean));
  });

  // Add member (owner-only)
  app.post('/workspaces/:id/members', {
    preHandler: [requireWorkspace, requireRole('owner')],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { email: string; role?: 'editor' | 'viewer' };
    if (!body?.email) throw AppError.validation('email required');

    // Lookup user by email (stub: assumes user already exists)
    const usersSnap = await db().collection('users').where('email', '==', body.email).limit(1).get();
    if (usersSnap.empty) throw AppError.notFound('User not found');
    const targetUid = usersSnap.docs[0].id;

    await db().doc(`workspaces/${id}/members/${targetUid}`).set({
      uid: targetUid,
      role: body.role ?? 'viewer',
      addedAt: new Date().toISOString(),
    });
    return ok(reply, { uid: targetUid, role: body.role ?? 'viewer' }, 201);
  });
}
