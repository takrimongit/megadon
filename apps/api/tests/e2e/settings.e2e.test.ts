// Validates the Geek Mode settings HTTP surface end-to-end against the
// deployed staging API.

import './helpers/env.js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  httpCall, createTestUser, deleteTestUser, cleanupWorkspaces,
  type E2ETestUser,
} from './helpers/client.js';
import type { GeekSettings, GeekDefaults } from '@megadon/types';

describe('e2e: settings/geek surface', () => {
  let user: E2ETestUser;
  let workspaceId: string;

  beforeAll(async () => {
    user = await createTestUser('geek');
    const ws = await httpCall({
      method: 'POST', path: '/v1/workspaces',
      idToken: user.idToken, body: { name: 'Geek E2E' },
    });
    workspaceId = ws.body.data.id;
  });

  afterAll(async () => {
    await cleanupWorkspaces(user.uid).catch(() => {});
    await deleteTestUser(user.uid).catch(() => {});
  });

  it('GET /settings/geek/defaults returns curated prompts + models per surface', async () => {
    const res = await httpCall<GeekDefaults>({
      method: 'GET', path: '/v1/settings/geek/defaults',
      idToken: user.idToken,
    });
    expect(res.status).toBe(200);
    const d = res.body.data!;
    expect(d.chat.systemPrompt.length).toBeGreaterThan(50);
    expect(d.chat.models).toContain('gpt-5-2');
    expect(d.analyze.defaultModel).toBe('gemini-2.5-flash');
    expect(d.image.promptTemplate).toContain('{{brand.colorNames}}');
    expect(d.video.promptTemplate).toContain('{{platform}}');
    expect(d.variables.brand).toContain('{{brand.companyName}}');
  });

  it('GET /settings/geek returns default (disabled) when doc does not exist', async () => {
    const res = await httpCall<GeekSettings>({
      method: 'GET', path: '/v1/settings/geek',
      idToken: user.idToken, workspaceId,
    });
    expect(res.status).toBe(200);
    expect(res.body.data?.enabled).toBe(false);
  });

  it('PUT /settings/geek persists overrides and returns the merged doc', async () => {
    const res = await httpCall<GeekSettings>({
      method: 'PUT', path: '/v1/settings/geek',
      idToken: user.idToken, workspaceId,
      body: {
        enabled: true,
        chat: { model: 'gpt-5-2', systemPrompt: 'Be terse.' },
        image: { promptTemplate: 'Headline: {{copy.headline}}' },
      },
    });
    expect(res.status).toBe(200);
    expect(res.body.data?.enabled).toBe(true);
    expect(res.body.data?.chat?.model).toBe('gpt-5-2');
    expect(res.body.data?.chat?.systemPrompt).toBe('Be terse.');
    expect(res.body.data?.image?.promptTemplate).toContain('{{copy.headline}}');
  });

  it('GET /settings/geek now returns the saved doc', async () => {
    const res = await httpCall<GeekSettings>({
      method: 'GET', path: '/v1/settings/geek',
      idToken: user.idToken, workspaceId,
    });
    expect(res.status).toBe(200);
    expect(res.body.data?.enabled).toBe(true);
    expect(res.body.data?.chat?.model).toBe('gpt-5-2');
  });

  it('PUT /settings/geek can flip enabled back to false without losing overrides', async () => {
    const res = await httpCall<GeekSettings>({
      method: 'PUT', path: '/v1/settings/geek',
      idToken: user.idToken, workspaceId,
      body: { enabled: false },
    });
    expect(res.status).toBe(200);
    expect(res.body.data?.enabled).toBe(false);
    expect(res.body.data?.chat?.model).toBe('gpt-5-2');
  });
});
