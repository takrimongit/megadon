import type { FastifyRequest } from 'fastify';
import { AppError } from '../lib/errors.js';
import { config } from '../lib/config.js';

// /internal/jobs/* are protected by Cloud Run IAM (the worker service is
// deployed with --no-allow-unauthenticated; only the tasks-invoker SA has
// roles/run.invoker). The platform validates the OIDC token before
// requests reach this container, so by the time we see the request the
// caller is already authorized.
//
// As a defense-in-depth check we verify the Authorization header carries
// a Bearer token. We don't decode it — Cloud Run already did. In emulator
// mode we skip entirely since Cloud Tasks isn't running.
export async function requireCloudTasks(req: FastifyRequest) {
  if (config.isEmulator()) return;

  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    throw AppError.forbidden('Internal endpoint requires OIDC token');
  }
}
