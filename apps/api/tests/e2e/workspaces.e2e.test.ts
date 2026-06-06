import './helpers/env.js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  httpCall, createTestUser, deleteTestUser, cleanupWorkspaces,
  type E2ETestUser,
} from './helpers/client.js';

describe('e2e: workspaces', () => {
  let alice: E2ETestUser;
  let bob: E2ETestUser;

  beforeAll(async () => {
    alice = await createTestUser('ws-alice');
    bob = await createTestUser('ws-bob');
  });

  afterAll(async () => {
    await cleanupWorkspaces(alice.uid).catch(() => {});
    await cleanupWorkspaces(bob.uid).catch(() => {});
    await deleteTestUser(alice.uid).catch(() => {});
    await deleteTestUser(bob.uid).catch(() => {});
  });

  it('creates a workspace and lists it for the owner', async () => {
    const create = await httpCall({
      method: 'POST', path: '/v1/workspaces', idToken: alice.idToken,
      body: { name: 'Alice E2E WS' },
    });
    expect(create.status).toBe(201);
    expect(create.body.data?.name).toBe('Alice E2E WS');
    expect(create.body.data?.ownerId).toBe(alice.uid);

    const list = await httpCall({
      method: 'GET', path: '/v1/workspaces', idToken: alice.idToken,
    });
    expect(list.status).toBe(200);
    const ids = (list.body.data as any[]).map((w) => w.id);
    expect(ids).toContain(create.body.data.id);
  });

  it('blocks cross-workspace access (Bob cannot use Alice\'s workspace)', async () => {
    const aliceWs = await httpCall({
      method: 'POST', path: '/v1/workspaces', idToken: alice.idToken,
      body: { name: 'Alice secret' },
    });
    const wid = aliceWs.body.data.id;

    const res = await httpCall({
      method: 'GET', path: '/v1/dashboard/stats',
      idToken: bob.idToken, workspaceId: wid,
    });
    expect(res.status).toBe(403);
    expect(res.body.error?.code).toBe('WORKSPACE_FORBIDDEN');
  });

  it('returns valid wizard options', async () => {
    const res = await httpCall({
      method: 'GET', path: '/v1/wizard/options', idToken: alice.idToken,
    });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data?.goals)).toBe(true);
    expect((res.body.data as any).goals.length).toBeGreaterThan(0);
  });
});
