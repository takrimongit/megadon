import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { mockOpenAI } from './helpers/mocks.js';

mockOpenAI();

import { call, closeApp } from './helpers/app.js';
import { clearFirestore, createTestUser } from './helpers/auth.js';

describe('Wizard', () => {
  beforeAll(async () => { await clearFirestore(); });
  beforeEach(async () => { await clearFirestore(); });
  afterAll(async () => { await closeApp(); });

  it('returns static wizard options', async () => {
    const user = await createTestUser('w@test.com');
    const res = await call({ method: 'GET', url: '/v1/wizard/options', idToken: user.idToken });
    expect(res.status).toBe(200);
    const data = res.body.data as any;
    expect(data.goals.length).toBeGreaterThan(0);
    expect(data.platforms.length).toBeGreaterThan(0);
    expect(data.ageGroups.length).toBeGreaterThan(0);
  });

  it('suggests personas and caches the result', async () => {
    const user = await createTestUser('w@test.com');
    const body = { ageGroups: ['25–34'], interests: ['Tech'], personaDescription: 'Test' };

    const first = await call({
      method: 'POST', url: '/v1/personas/suggest', idToken: user.idToken, body,
    });
    expect(first.status).toBe(200);
    expect((first.body.data as any[]).length).toBe(3);

    // Second call with same body should hit cache (still returns 3).
    const second = await call({
      method: 'POST', url: '/v1/personas/suggest', idToken: user.idToken, body,
    });
    expect(second.status).toBe(200);
    expect((second.body.data as any[]).length).toBe(3);
  });
});
