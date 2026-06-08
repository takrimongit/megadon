import type { FastifyInstance } from 'fastify';
import { requireCloudTasks } from '../middleware/oidc.js';
import { ok } from '../lib/envelope.js';
import { runGenerateAd } from '../jobs/generateAd.js';
import { runPollCreative } from '../jobs/pollCreative.js';
import { runReviseAd } from '../jobs/reviseAd.js';
import { runPollRevisionCreative } from '../jobs/pollRevisionCreative.js';
import { runAnalyzeBrand } from '../jobs/analyzeBrand.js';

export async function internalRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireCloudTasks);

  app.post('/internal/jobs/generate-ad', async (req, reply) => {
    await runGenerateAd(req.body as any);
    return ok(reply, { ok: true });
  });

  app.post('/internal/jobs/poll-creative', async (req, reply) => {
    await runPollCreative(req.body as any);
    return ok(reply, { ok: true });
  });

  app.post('/internal/jobs/revise-ad', async (req, reply) => {
    await runReviseAd(req.body as any);
    return ok(reply, { ok: true });
  });

  app.post('/internal/jobs/poll-revision-creative', async (req, reply) => {
    await runPollRevisionCreative(req.body as any);
    return ok(reply, { ok: true });
  });

  app.post('/internal/jobs/analyze-brand', async (req, reply) => {
    await runAnalyzeBrand(req.body as any);
    return ok(reply, { ok: true });
  });
}
