import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';

let appInstance: FastifyInstance | null = null;

export async function getApp(): Promise<FastifyInstance> {
  if (!appInstance) {
    appInstance = await buildApp();
    await appInstance.ready();
  }
  return appInstance;
}

export async function closeApp() {
  if (appInstance) {
    await appInstance.close();
    appInstance = null;
  }
}

interface InjectOpts {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  url: string;
  idToken?: string;
  workspaceId?: string;
  body?: unknown;
}

export async function call<T = any>(opts: InjectOpts): Promise<{ status: number; body: { data: T | null; error: { code: string; message: string } | null } }> {
  const app = await getApp();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.idToken) headers['authorization'] = `Bearer ${opts.idToken}`;
  if (opts.workspaceId) headers['x-workspace-id'] = opts.workspaceId;

  const resp = await app.inject({
    method: opts.method,
    url: opts.url,
    headers,
    payload: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  let parsed: any;
  try { parsed = resp.json(); } catch { parsed = { data: null, error: { code: 'PARSE', message: resp.body } }; }
  return { status: resp.statusCode, body: parsed };
}
