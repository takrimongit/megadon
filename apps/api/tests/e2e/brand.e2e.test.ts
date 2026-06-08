// Validates the brand-onboarding HTTP surface end-to-end against the
// deployed staging API. Does NOT call /brand/analyze (that hits real
// kie.ai and is covered separately by the paid full-pipeline test).

import './helpers/env.js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import admin from 'firebase-admin';
import {
  httpCall, createTestUser, deleteTestUser, cleanupWorkspaces,
  type E2ETestUser,
} from './helpers/client.js';
import type { BrandInfo, BrandPlaybook } from '@megadon/types';

const STAGING_BUCKET = `${process.env.GCP_PROJECT}-staging-assets`;

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

const SAMPLE_INFO: BrandInfo = {
  companyName: 'Acme E2E Co',
  websiteUrl: 'https://acme.test',
  industry: 'Technology & Software',
  description: 'We build cloud-native developer tools for distributed teams.',
};

async function cleanupBrandAssets(workspaceId: string) {
  try {
    const prefix = `workspaces/${workspaceId}/brand/`;
    const [files] = await admin.storage().bucket(STAGING_BUCKET).getFiles({ prefix });
    await Promise.all(files.map((f) => f.delete().catch(() => {})));
  } catch {}
}

describe('e2e: brand playbook surface', () => {
  let user: E2ETestUser;
  let workspaceId: string;
  let uploadedAssetIds: string[] = [];

  beforeAll(async () => {
    user = await createTestUser('brand');
    const ws = await httpCall({
      method: 'POST', path: '/v1/workspaces',
      idToken: user.idToken, body: { name: 'Brand E2E' },
    });
    workspaceId = ws.body.data.id;
  });

  afterAll(async () => {
    await cleanupBrandAssets(workspaceId).catch(() => {});
    await cleanupWorkspaces(user.uid).catch(() => {});
    await deleteTestUser(user.uid).catch(() => {});
  });

  it('GET /brand/playbook auto-initializes an empty playbook on first call', async () => {
    const res = await httpCall<BrandPlaybook>({
      method: 'GET', path: '/v1/brand/playbook',
      idToken: user.idToken, workspaceId,
    });
    expect(res.status).toBe(200);
    expect(res.body.data?.workspaceId).toBe(workspaceId);
    expect(res.body.data?.status).toBe('empty');
    expect(res.body.data?.info).toBeNull();
    expect(res.body.data?.assets).toEqual([]);
  });

  it('PUT /brand/info saves info and transitions status to draft', async () => {
    const res = await httpCall<BrandPlaybook>({
      method: 'PUT', path: '/v1/brand/info',
      idToken: user.idToken, workspaceId,
      body: SAMPLE_INFO,
    });
    expect(res.status).toBe(200);
    expect(res.body.data?.status).toBe('draft');
    expect(res.body.data?.info?.companyName).toBe(SAMPLE_INFO.companyName);
    expect(res.body.data?.info?.industry).toBe(SAMPLE_INFO.industry);
  });

  it('PUT /brand/info rejects too-short description (Zod validation)', async () => {
    const res = await httpCall({
      method: 'PUT', path: '/v1/brand/info',
      idToken: user.idToken, workspaceId,
      body: { ...SAMPLE_INFO, description: 'short' },
    });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_FAILED');
  });

  it('signed-upload → PUT to GCS → register lands the asset in the playbook', async () => {
    // 1. Ask for a signed URL.
    const signedRes = await httpCall<{ url: string; assetPath: string }>({
      method: 'POST', path: '/v1/brand/assets/signed-upload',
      idToken: user.idToken, workspaceId,
      body: { type: 'logo', mimeType: 'image/png', filename: 'logo.png' },
    });
    expect(signedRes.status).toBe(200);
    expect(signedRes.body.data?.url).toMatch(/^https:\/\/storage\.googleapis\.com\//);
    expect(signedRes.body.data?.assetPath).toContain(`workspaces/${workspaceId}/brand/logo/`);

    // 2. PUT the bytes directly to GCS.
    const put = await fetch(signedRes.body.data!.url, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      body: TINY_PNG,
    });
    expect(put.status).toBe(200);

    // 3. Register the asset.
    const reg = await httpCall({
      method: 'POST', path: '/v1/brand/assets/register',
      idToken: user.idToken, workspaceId,
      body: { type: 'logo', path: signedRes.body.data!.assetPath, mimeType: 'image/png', filename: 'logo.png' },
    });
    expect(reg.status).toBe(201);
    expect(reg.body.data?.id).toBeTruthy();
    expect(reg.body.data?.type).toBe('logo');
    uploadedAssetIds.push(reg.body.data!.id);

    // 4. Playbook now lists the asset.
    const pb = await httpCall<BrandPlaybook>({
      method: 'GET', path: '/v1/brand/playbook',
      idToken: user.idToken, workspaceId,
    });
    expect(pb.body.data?.assets.length).toBeGreaterThanOrEqual(1);
    expect(pb.body.data?.assets.some((a) => a.id === reg.body.data!.id)).toBe(true);
  });

  it('DELETE /brand/assets/:id removes the asset', async () => {
    const assetId = uploadedAssetIds[0];
    expect(assetId).toBeTruthy();

    const del = await httpCall({
      method: 'DELETE', path: `/v1/brand/assets/${assetId}`,
      idToken: user.idToken, workspaceId,
    });
    expect(del.status).toBe(200);

    const pb = await httpCall<BrandPlaybook>({
      method: 'GET', path: '/v1/brand/playbook',
      idToken: user.idToken, workspaceId,
    });
    expect(pb.body.data?.assets.some((a) => a.id === assetId)).toBe(false);
  });

  it('PATCH /brand/playbook merges into the analysis object', async () => {
    // Seed analysis directly via Admin SDK so we can PATCH without
    // triggering a real AI call.
    const db = admin.firestore();
    await db.doc(`workspaces/${workspaceId}/brandPlaybook/current`).update({
      analysis: {
        colors: [],
        personality: ['Bold'],
        toneOfVoice: 'Direct',
        visualStyle: '',
        targetAudience: '',
        creativeStyles: [],
        brandRules: ['Always use the wordmark'],
        messagingStyle: '',
        ctaPreferences: [],
        confidence: { colors: 0.5, personality: 0.8, toneOfVoice: 0.7, visualStyle: 0.5, audience: 0.5 },
      },
      status: 'ready',
      updatedAt: new Date().toISOString(),
    });

    const res = await httpCall<BrandPlaybook>({
      method: 'PATCH', path: '/v1/brand/playbook',
      idToken: user.idToken, workspaceId,
      body: { analysis: { toneOfVoice: 'Friendly and authoritative.' } },
    });
    expect(res.status).toBe(200);
    expect(res.body.data?.analysis?.toneOfVoice).toBe('Friendly and authoritative.');
    // Other fields preserved by the merge.
    expect(res.body.data?.analysis?.brandRules).toContain('Always use the wordmark');
  });

  it('POST /brand/playbook/approve flips the status to approved', async () => {
    const res = await httpCall({
      method: 'POST', path: '/v1/brand/playbook/approve',
      idToken: user.idToken, workspaceId,
    });
    expect(res.status).toBe(200);

    const pb = await httpCall<BrandPlaybook>({
      method: 'GET', path: '/v1/brand/playbook',
      idToken: user.idToken, workspaceId,
    });
    expect(pb.body.data?.status).toBe('approved');
    expect(pb.body.data?.approvedAt).toBeTruthy();
  });

  it('rejects /brand/* without auth', async () => {
    const res = await httpCall({ method: 'GET', path: '/v1/brand/playbook' });
    expect(res.status).toBe(401);
  });
});
