import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { db } from '../lib/firebase.js';
import { requireAuth } from '../middleware/auth.js';
import { ok } from '../lib/envelope.js';
import { defaultWizardOptions } from '../lib/wizardOptions.js';
import { kieProvider } from '../providers/kie.js';
import { SuggestPersonasBody, type Persona } from '@megadon/types';

const CACHE_TTL_HOURS = 24;

function hashInput(input: object): string {
  return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex').slice(0, 16);
}

export async function wizardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth);

  app.get('/wizard/options', async (_req, reply) => {
    const snap = await db().doc('config/wizardOptions').get();
    const opts = snap.exists ? snap.data() : defaultWizardOptions;
    return ok(reply, opts);
  });

  app.post('/personas/suggest', async (req, reply) => {
    const body = SuggestPersonasBody.parse(req.body);
    const hash = hashInput(body);
    const cacheRef = db().doc(`personaCache/${hash}`);
    const cached = await cacheRef.get();
    if (cached.exists) {
      const data = cached.data()!;
      const ageMs = Date.now() - new Date(data.cachedAt).getTime();
      if (ageMs < CACHE_TTL_HOURS * 3600_000) {
        return ok(reply, data.personas as Persona[]);
      }
    }
    const personas = await kieProvider.suggestPersonas(body);
    await cacheRef.set({ personas, cachedAt: new Date().toISOString() });
    return ok(reply, personas);
  });
}
