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

    const next: GeekSettings = {
      enabled: body.enabled ?? existing.enabled,
      chat: body.chat ?? existing.chat,
      revise: body.revise ?? existing.revise,
      personas: body.personas ?? existing.personas,
      analyze: body.analyze ?? existing.analyze,
      image: body.image ?? existing.image,
      video: body.video ?? existing.video,
      updatedAt: new Date().toISOString(),
    };
    await ref.set(next);
    return ok(reply, next);
  });
}
