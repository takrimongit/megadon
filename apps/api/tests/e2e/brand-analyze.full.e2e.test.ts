// Full Brand Info → analyzeBrand worker → kie.ai → ready pipeline against
// live staging. Costs real money (~$0.01 per run). Runs only via
// `npm run test:e2e:full` / the workflow_dispatch prod-promote gate.

import './helpers/env.js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import admin from 'firebase-admin';
import {
  httpCall, createTestUser, deleteTestUser, cleanupWorkspaces,
  type E2ETestUser,
} from './helpers/client.js';
import type { BrandInfo, BrandPlaybook } from '@megadon/types';

const TERMINAL_STATES = ['ready', 'failed'] as const;
const MAX_WAIT_MS = 90_000;

const INFO: BrandInfo = {
  companyName: 'Lumen Analytics',
  websiteUrl: 'https://lumen.example',
  industry: 'Technology & Software',
  description:
    'Lumen builds developer-first observability dashboards for distributed systems. We help engineering teams find root cause faster.',
};

describe('e2e: full brand analyze pipeline (real kie.ai)', () => {
  let user: E2ETestUser;
  let workspaceId: string;

  beforeAll(async () => {
    user = await createTestUser('brand-full');
    const ws = await httpCall({
      method: 'POST', path: '/v1/workspaces',
      idToken: user.idToken, body: { name: 'Brand Analyze E2E' },
    });
    workspaceId = ws.body.data.id;
  });

  afterAll(async () => {
    await cleanupWorkspaces(user.uid).catch(() => {});
    await deleteTestUser(user.uid).catch(() => {});
  });

  it('Brand info → analyze → ready with populated analysis', async () => {
    // 1. Save brand info.
    const info = await httpCall<BrandPlaybook>({
      method: 'PUT', path: '/v1/brand/info',
      idToken: user.idToken, workspaceId,
      body: INFO,
    });
    expect(info.status).toBe(200);
    expect(info.body.data?.status).toBe('draft');

    // 2. Kick off analysis.
    const start = await httpCall({
      method: 'POST', path: '/v1/brand/analyze',
      idToken: user.idToken, workspaceId,
    });
    expect(start.status).toBe(200);

    // 3. Poll Firestore for terminal status.
    const db = admin.firestore();
    const ref = db.doc(`workspaces/${workspaceId}/brandPlaybook/current`);

    const begin = Date.now();
    let finalStatus = '';
    let finalData: BrandPlaybook | undefined;
    while (Date.now() - begin < MAX_WAIT_MS) {
      const snap = await ref.get();
      const data = snap.data() as BrandPlaybook | undefined;
      const status = data?.status ?? '';
      if (TERMINAL_STATES.includes(status as any)) {
        finalStatus = status;
        finalData = data;
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (finalStatus !== 'ready') {
      // Surface what the worker captured so CI logs are diagnostic.
      throw new Error(
        `analyze did not reach 'ready' — status=${finalStatus} error=${JSON.stringify(finalData?.error)}`,
      );
    }
    expect(finalStatus).toBe('ready');

    const analysis = finalData!.analysis!;
    expect(analysis).toBeTruthy();

    // The model must produce *something* for each major section. We don't
    // assert exact content, only that the pipeline produced a coherent
    // playbook — that's enough to catch shape/integration regressions.
    expect(analysis.colors.length).toBeGreaterThan(0);
    expect(analysis.colors[0].hex).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(analysis.personality.length).toBeGreaterThan(0);
    expect(analysis.toneOfVoice.length).toBeGreaterThan(0);
    expect(analysis.visualStyle.length).toBeGreaterThan(0);
    expect(analysis.brandRules.length).toBeGreaterThan(0);
  }, MAX_WAIT_MS + 30_000);
});
