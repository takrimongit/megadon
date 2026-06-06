import './helpers/env.js';
import { describe, it, expect } from 'vitest';
import { httpCall, STAGING_URL } from './helpers/client.js';

describe('e2e: smoke', () => {
  it('exposes /health publicly', async () => {
    const resp = await fetch(`${STAGING_URL}/health`);
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.ok).toBe(true);
    expect(body.role).toBe('api');
  });

  it('rejects /v1/* without an Authorization header', async () => {
    const res = await httpCall({ method: 'GET', path: '/v1/workspaces' });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTH_REQUIRED');
  });

  it('rejects /v1/* with a malformed token', async () => {
    const res = await httpCall({
      method: 'GET', path: '/v1/workspaces', idToken: 'not-a-real-jwt',
    });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTH_REQUIRED');
  });

  it('returns Fastify 404 for unknown routes (not Google GFE 404)', async () => {
    const resp = await fetch(`${STAGING_URL}/__definitely-not-a-route`);
    expect(resp.status).toBe(404);
    // Fastify's 404 returns JSON; GFE's reserved-path 404 returns HTML.
    const body = await resp.text();
    expect(body).toContain('Route GET');
  });
});
