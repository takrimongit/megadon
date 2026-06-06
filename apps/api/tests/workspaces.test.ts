import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { call, closeApp } from './helpers/app.js';
import { clearFirestore, createTestUser } from './helpers/auth.js';

describe('Workspaces', () => {
  beforeAll(async () => {
    await clearFirestore();
  });
  beforeEach(async () => {
    await clearFirestore();
  });
  afterAll(async () => {
    await closeApp();
  });

  it('rejects unauthenticated requests', async () => {
    const res = await call({ method: 'GET', url: '/v1/workspaces' });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTH_REQUIRED');
  });

  it('creates a workspace and lists it for the owner', async () => {
    const user = await createTestUser('owner@test.com');

    const create = await call({
      method: 'POST',
      url: '/v1/workspaces',
      idToken: user.idToken,
      body: { name: 'Acme Co' },
    });
    expect(create.status).toBe(201);
    expect(create.body.data?.name).toBe('Acme Co');
    expect(create.body.data?.ownerId).toBe(user.uid);

    const list = await call({ method: 'GET', url: '/v1/workspaces', idToken: user.idToken });
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.data)).toBe(true);
    expect((list.body.data as any[]).length).toBe(1);
  });

  it('rejects member invites from non-owners', async () => {
    const owner = await createTestUser('owner@test.com');
    const editor = await createTestUser('editor@test.com');
    const create = await call({
      method: 'POST',
      url: '/v1/workspaces',
      idToken: owner.idToken,
      body: { name: 'Acme' },
    });
    const wid = (create.body.data as any).id;

    // editor is not yet a member → can't invite
    const invite = await call({
      method: 'POST',
      url: `/v1/workspaces/${wid}/members`,
      idToken: editor.idToken,
      workspaceId: wid,
      body: { email: 'someone@test.com' },
    });
    expect(invite.status).toBe(403);
  });

  it('blocks cross-workspace access', async () => {
    const alice = await createTestUser('alice@test.com');
    const bob = await createTestUser('bob@test.com');
    const a = await call({
      method: 'POST', url: '/v1/workspaces', idToken: alice.idToken, body: { name: 'Alice WS' },
    });
    const wid = (a.body.data as any).id;

    // bob tries to use alice's workspace header
    const stats = await call({
      method: 'GET',
      url: '/v1/dashboard/stats',
      idToken: bob.idToken,
      workspaceId: wid,
    });
    expect(stats.status).toBe(403);
  });
});
