import type { FastifyInstance } from 'fastify';
import { requireCloudTasks } from '../middleware/oidc.js';
import { ok } from '../lib/envelope.js';
import { runGenerateAd } from '../jobs/generateAd.js';
import { runPollHiggsfield } from '../jobs/pollHiggsfield.js';
import { runReviseAd } from '../jobs/reviseAd.js';

export async function internalRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireCloudTasks);

  app.post('/internal/jobs/generate-ad', async (req, reply) => {
    await runGenerateAd(req.body as any);
    return ok(reply, { ok: true });
  });

  app.post('/internal/jobs/poll-higgsfield', async (req, reply) => {
    await runPollHiggsfield(req.body as any);
    return ok(reply, { ok: true });
  });

  app.post('/internal/jobs/revise-ad', async (req, reply) => {
    await runReviseAd(req.body as any);
    return ok(reply, { ok: true });
  });
}
