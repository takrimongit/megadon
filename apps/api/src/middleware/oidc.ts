import type { FastifyRequest } from 'fastify';
import { AppError } from '../lib/errors.js';
import { config } from '../lib/config.js';

// In production Cloud Tasks signs requests with an OIDC token issued for our
// service account. Cloud Run terminates and validates the token, then forwards
// the email in `x-goog-authenticated-user-email`. We just verify identity matches.
export async function requireCloudTasks(req: FastifyRequest) {
  if (config.isEmulator()) return; // Skip in dev/emulator mode.

  const callerEmail = req.headers['x-goog-authenticated-user-email'];
  const expected = config.tasksInvokerSA;
  if (typeof callerEmail !== 'string' || !callerEmail.includes(expected)) {
    throw AppError.forbidden('Cloud Tasks OIDC verification failed');
  }
}
