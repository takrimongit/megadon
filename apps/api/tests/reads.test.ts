import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { call, closeApp } from './helpers/app.js';
import { clearFirestore, createTestUser } from './helpers/auth.js';

async function setup() {
  const user = await createTestUser('r@test.com');
  const ws = await call({
    method: 'POST', url: '/v1/workspaces', idToken: user.idToken, body: { name: 'R WS' },
  });
  return { user, wid: (ws.body.data as any).id };
}

describe('Read endpoints', () => {
  beforeAll(async () => { await clearFirestore(); });
  beforeEach(async () => { await clearFirestore(); });
  afterAll(async () => { await closeApp(); });

  it('healthz', async () => {
    const res = await call({ method: 'GET', url: '/healthz' });
    expect(res.status).toBe(200);
  });

  it('dashboard stats returns zeros when no aggregate doc exists', async () => {
    const { user, wid } = await setup();
    const res = await call({
      method: 'GET', url: '/v1/dashboard/stats', idToken: user.idToken, workspaceId: wid,
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ activeCampaigns: 0, adsGenerated: 0, approvalRate: 0, avgRoas: 0 });
  });

  it('returns campaign metrics stub', async () => {
    const { user, wid } = await setup();
    const res = await call({
      method: 'GET', url: '/v1/campaigns/abc/metrics?period=7d', idToken: user.idToken, workspaceId: wid,
    });
    expect(res.status).toBe(200);
    expect((res.body.data as any).period).toBe('7d');
    expect((res.body.data as any).metrics.roas).toBeGreaterThan(0);
  });

  it('returns playbook stub', async () => {
    const { user, wid } = await setup();
    const res = await call({
      method: 'GET', url: '/v1/playbook', idToken: user.idToken, workspaceId: wid,
    });
    expect(res.status).toBe(200);
    expect((res.body.data as any).rules.length).toBeGreaterThan(0);
  });
});
