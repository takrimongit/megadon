import type { FastifyInstance } from 'fastify';
import { requireAuth, requireWorkspace } from '../middleware/auth.js';
import { ok } from '../lib/envelope.js';
import { settingsRef } from '../lib/geekSettings.js';
import { UpdateGeekSettingsBody, type GeekSettings } from '@megadon/types';

const DEFAULT_GEEK: GeekSettings = {
  enabled: false,
  updatedAt: new Date(0).toISOString(),
};

export async function settingsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireWorkspace);

  // GET current Geek Mode settings (auto-init with disabled defaults).
  app.get('/settings/geek', async (req, reply) => {
    const ref = settingsRef(req.workspace!.id);
    const snap = await ref.get();
    if (!snap.exists) {
      return ok(reply, DEFAULT_GEEK);
    }
    return ok(reply, snap.data() as GeekSettings);
  });

  // PUT — replace fields. Each override block is fully replaced when
  // supplied; absent blocks remain unchanged.
  app.put('/settings/geek', async (req, reply) => {
    const body = UpdateGeekSettingsBody.parse(req.body);
    const ref = settingsRef(req.workspace!.id);
    const snap = await ref.get();
    const existing = snap.exists ? (snap.data() as GeekSettings) : DEFAULT_GEEK;

    // Firestore admin SDK rejects `undefined` values, so we omit absent
    // override blocks entirely rather than writing `undefined`.
    const next: GeekSettings = {
      enabled: body.enabled ?? existing.enabled,
      updatedAt: new Date().toISOString(),
    };
    const chat = body.chat ?? existing.chat;
    const revise = body.revise ?? existing.revise;
    const personas = body.personas ?? existing.personas;
    const analyze = body.analyze ?? existing.analyze;
    const image = body.image ?? existing.image;
    const video = body.video ?? existing.video;
    if (chat) next.chat = chat;
    if (revise) next.revise = revise;
    if (personas) next.personas = personas;
    if (analyze) next.analyze = analyze;
    if (image) next.image = image;
    if (video) next.video = video;

    await ref.set(next);
    return ok(reply, next);
  });
}
