import type { FastifyRequest, FastifyReply } from 'fastify';
import { auth, db } from '../lib/firebase.js';
import { AppError } from '../lib/errors.js';
import type { Role } from '@megadon/types';

declare module 'fastify' {
  interface FastifyRequest {
    user?: { uid: string; email: string };
    workspace?: { id: string; role: Role };
  }
}

export async function requireAuth(req: FastifyRequest, _reply: FastifyReply) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw AppError.authRequired();
  const token = header.slice(7);
  try {
    const decoded = await auth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email ?? '' };
  } catch {
    throw AppError.authRequired('Invalid token');
  }
}

export async function requireWorkspace(req: FastifyRequest, _reply: FastifyReply) {
  if (!req.user) throw AppError.authRequired();
  const wid = req.headers['x-workspace-id'];
  if (typeof wid !== 'string' || !wid) throw AppError.forbidden('Workspace header missing');

  const memberDoc = await db().doc(`workspaces/${wid}/members/${req.user.uid}`).get();
  if (!memberDoc.exists) throw AppError.forbidden();
  req.workspace = { id: wid, role: memberDoc.data()!.role };
}

export function requireRole(...allowed: Role[]) {
  return async (req: FastifyRequest) => {
    if (!req.workspace) throw AppError.forbidden();
    if (!allowed.includes(req.workspace.role)) {
      throw AppError.forbidden(`Requires role: ${allowed.join(' or ')}`);
    }
  };
}
