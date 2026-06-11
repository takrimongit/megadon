// Validates the usage metering HTTP surface against staging.

import './helpers/env.js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  httpCall, createTestUser, deleteTestUser, cleanupWorkspaces,
  type E2ETestUser,
} from './helpers/client.js';
import type { AiPricingTable, UsageSummary } from '@megadon/types';

describe('e2e: usage metering surface', () => {
  let user: E2ETestUser;
  let workspaceId: string;

  beforeAll(async () => {
    user = await createTestUser('usage');
    const ws = await httpCall({
      method: 'POST', path: '/v1/workspaces',
      idToken: user.idToken, body: { name: 'Usage E2E' },
    });
    workspaceId = ws.body.data.id;
  });

  afterAll(async () => {
    await cleanupWorkspaces(user.uid).catch(() => {});
    await deleteTestUser(user.uid).catch(() => {});
  });

  it('GET /usage/pricing returns the model pricing table', async () => {
    const res = await httpCall<AiPricingTable>({
      method: 'GET', path: '/v1/usage/pricing', idToken: user.idToken,
    });
    expect(res.status).toBe(200);
    const d = res.body.data!;
    expect(d.creditUsd).toBeGreaterThan(0);
    expect(d.models['flux-2/pro-text-to-image'].unit).toBe('image');
    expect(d.models['veo3_lite'].unit).toBe('video');
    expect(d.fallback.call.estCredits).toBeGreaterThan(0);
  });

  it('GET /usage/summary returns totals + live kie credit balance', async () => {
    const res = await httpCall<UsageSummary>({
      method: 'GET', path: '/v1/usage/summary',
      idToken: user.idToken, workspaceId,
    });
    expect(res.status).toBe(200);
    const d = res.body.data!;
    expect(d.windowDays).toBe(30);
    expect(d.totals.operations).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(d.byModel)).toBe(true);
    expect(Array.isArray(d.bySurface)).toBe(true);
    // Staging has a real KIE key, so the balance should be a number.
    expect(typeof d.creditsRemaining).toBe('number');
    expect(d.creditsRemainingUsd).not.toBeNull();
  });
});
