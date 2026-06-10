// Validates firestore.rules against the Firestore emulator using the
// official @firebase/rules-unit-testing harness. Catches cross-tenant
// data exposure + client write attempts to server-only collections.

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RULES_PATH = path.resolve(__dirname, '../../../../firestore.rules');

let env: RulesTestEnvironment;

// Seed common test data through the admin (rules-disabled) context.
async function seedWorkspace(wid: string, ownerUid: string) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, `workspaces/${wid}`), {
      name: wid,
      ownerId: ownerUid,
      plan: 'free',
      createdAt: new Date().toISOString(),
    });
    await setDoc(doc(db, `workspaces/${wid}/members/${ownerUid}`), {
      uid: ownerUid,
      role: 'owner',
      addedAt: new Date().toISOString(),
    });
  });
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'rules-test',
    firestore: {
      rules: fs.readFileSync(RULES_PATH, 'utf8'),
      host: 'localhost',
      port: parseInt(process.env.FIRESTORE_EMULATOR_HOST?.split(':')[1] ?? '8081', 10),
    },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
});

afterAll(async () => {
  await env.cleanup();
});

describe('firestore.rules: workspaces', () => {
  it('members can read their workspace', async () => {
    await seedWorkspace('ws1', 'alice');
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(db, 'workspaces/ws1')));
  });

  it('non-members cannot read another workspace', async () => {
    await seedWorkspace('ws1', 'alice');
    const db = env.authenticatedContext('bob').firestore();
    await assertFails(getDoc(doc(db, 'workspaces/ws1')));
  });

  it('unauthenticated users cannot read workspaces', async () => {
    await seedWorkspace('ws1', 'alice');
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'workspaces/ws1')));
  });
});

describe('firestore.rules: batches (server-only)', () => {
  it('members can READ batches in their workspace', async () => {
    await seedWorkspace('ws1', 'alice');
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'workspaces/ws1/batches/b1'), {
        status: 'pending_review',
      });
    });
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(db, 'workspaces/ws1/batches/b1')));
  });

  it('clients cannot CREATE batches (server-only)', async () => {
    await seedWorkspace('ws1', 'alice');
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(
      setDoc(doc(db, 'workspaces/ws1/batches/b-new'), { status: 'queued' })
    );
  });

  it('clients cannot UPDATE batches (server-only)', async () => {
    await seedWorkspace('ws1', 'alice');
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'workspaces/ws1/batches/b1'), {
        status: 'pending_review',
      });
    });
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'workspaces/ws1/batches/b1'), { status: 'approved' }));
  });

  it('non-members cannot read batches', async () => {
    await seedWorkspace('ws1', 'alice');
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'workspaces/ws1/batches/b1'), {
        status: 'pending_review',
      });
    });
    const db = env.authenticatedContext('bob').firestore();
    await assertFails(getDoc(doc(db, 'workspaces/ws1/batches/b1')));
  });
});

describe('firestore.rules: ads (server-only)', () => {
  it('members can READ ads in their workspace', async () => {
    await seedWorkspace('ws1', 'alice');
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'workspaces/ws1/batches/b1/ads/a1'), {
        status: 'pending', headline: 'h',
      });
    });
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(db, 'workspaces/ws1/batches/b1/ads/a1')));
  });

  it('clients cannot WRITE ads', async () => {
    await seedWorkspace('ws1', 'alice');
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(
      setDoc(doc(db, 'workspaces/ws1/batches/b1/ads/a-new'), { status: 'pending' })
    );
  });
});

describe('firestore.rules: users', () => {
  it('user can read their own profile', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users/alice'), { email: 'a@x' });
    });
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(db, 'users/alice')));
  });

  it('user cannot read another user profile', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users/alice'), { email: 'a@x' });
    });
    const db = env.authenticatedContext('bob').firestore();
    await assertFails(getDoc(doc(db, 'users/alice')));
  });

  it('user can write their own profile', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(db, 'users/alice'), { email: 'a@x' }));
  });
});

describe('firestore.rules: server-only collections', () => {
  it('clients cannot read or write personaCache', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(getDoc(doc(db, 'personaCache/anything')));
    await assertFails(setDoc(doc(db, 'personaCache/anything'), { x: 1 }));
  });

  it('clients can read config (wizard options) but not write', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'config/wizardOptions'), { goals: [] });
    });
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(db, 'config/wizardOptions')));
    await assertFails(setDoc(doc(db, 'config/wizardOptions'), { goals: [] }));
  });
});

describe('firestore.rules: brandPlaybook (server-only writes)', () => {
  it('members can READ the brand playbook', async () => {
    await seedWorkspace('ws1', 'alice');
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'workspaces/ws1/brandPlaybook/current'), {
        status: 'approved', info: { companyName: 'Acme' },
      });
    });
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(db, 'workspaces/ws1/brandPlaybook/current')));
  });

  it('non-members cannot read the brand playbook', async () => {
    await seedWorkspace('ws1', 'alice');
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'workspaces/ws1/brandPlaybook/current'), {
        status: 'approved',
      });
    });
    const db = env.authenticatedContext('bob').firestore();
    await assertFails(getDoc(doc(db, 'workspaces/ws1/brandPlaybook/current')));
  });

  it('clients cannot write the brand playbook', async () => {
    await seedWorkspace('ws1', 'alice');
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(
      setDoc(doc(db, 'workspaces/ws1/brandPlaybook/current'), { status: 'approved' })
    );
  });
});

describe('firestore.rules: settings/geek (server-only writes)', () => {
  it('members can READ the geek settings doc', async () => {
    await seedWorkspace('ws1', 'alice');
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'workspaces/ws1/settings/geek'), {
        enabled: true, updatedAt: new Date().toISOString(),
      });
    });
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(db, 'workspaces/ws1/settings/geek')));
  });

  it('non-members cannot read the geek settings doc', async () => {
    await seedWorkspace('ws1', 'alice');
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'workspaces/ws1/settings/geek'), {
        enabled: false, updatedAt: new Date().toISOString(),
      });
    });
    const db = env.authenticatedContext('bob').firestore();
    await assertFails(getDoc(doc(db, 'workspaces/ws1/settings/geek')));
  });

  it('clients cannot write geek settings (must go via API)', async () => {
    await seedWorkspace('ws1', 'alice');
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(
      setDoc(doc(db, 'workspaces/ws1/settings/geek'), {
        enabled: true, updatedAt: new Date().toISOString(),
      })
    );
  });
});
