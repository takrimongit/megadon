import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { ZodError } from 'zod';
import { randomUUID } from 'node:crypto';
import { config } from './lib/config.js';
import { initFirebase } from './lib/firebase.js';
import { AppError } from './lib/errors.js';
import { fail } from './lib/envelope.js';
import { workspaceRoutes } from './routes/workspaces.js';
import { wizardRoutes } from './routes/wizard.js';
import { batchRoutes } from './routes/batches.js';
import { adRoutes } from './routes/ads.js';
import { readRoutes } from './routes/reads.js';
import { internalRoutes } from './routes/internal.js';

initFirebase();

const app = Fastify({
  logger: { level: config.env === 'production' ? 'info' : 'debug' },
  genReqId: () => randomUUID(),
});

await app.register(helmet, { contentSecurityPolicy: false });
await app.register(cors, { origin: true });

app.get('/healthz', async () => ({ ok: true, role: config.role }));

// API surface (only when ROLE=api)
if (config.role === 'api') {
  await app.register(workspaceRoutes, { prefix: '/v1' });
  await app.register(wizardRoutes, { prefix: '/v1' });
  await app.register(batchRoutes, { prefix: '/v1' });
  await app.register(adRoutes, { prefix: '/v1' });
  await app.register(readRoutes, { prefix: '/v1' });
}

// Worker routes available on both api (for emulator) and worker roles.
await app.register(internalRoutes);

app.setErrorHandler((err: unknown, req, reply) => {
  req.log.error({ err }, 'request failed');
  if (err instanceof AppError) {
    return fail(reply, err.code, err.message, err.status);
  }
  if (err instanceof ZodError) {
    return fail(reply, 'VALIDATION_FAILED', err.errors.map((e) => e.message).join('; '), 400);
  }
  const message = err instanceof Error ? err.message : 'Internal error';
  return fail(reply, 'INTERNAL', message, 500);
});

const port = config.port;
app.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`API listening on :${port} role=${config.role} emulator=${config.isEmulator()}`);
});
