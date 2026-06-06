import type {
  ApiResponse,
  Workspace,
  Persona,
  Brief,
  DashboardStats,
  WizardOptions,
} from '@megadon/types';
import { getAuthToken, getWorkspaceId } from './firebase';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

class ApiClientError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  opts: { requireWorkspace?: boolean } = {},
): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (opts.requireWorkspace !== false) {
    const wid = getWorkspaceId();
    if (wid) headers['x-workspace-id'] = wid;
  }

  const resp = await fetch(`${API_BASE}/v1${path}`, { ...init, headers });
  const body = (await resp.json()) as ApiResponse<T>;
  if (body.error) {
    throw new ApiClientError(body.error.code, body.error.message, resp.status);
  }
  return body.data as T;
}

export const api = {
  // Workspaces
  listWorkspaces: () => request<Workspace[]>('/workspaces', {}, { requireWorkspace: false }),
  createWorkspace: (name: string) =>
    request<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify({ name }) }, { requireWorkspace: false }),

  // Wizard
  wizardOptions: () => request<WizardOptions>('/wizard/options'),
  suggestPersonas: (input: { ageGroups: string[]; interests: string[]; personaDescription?: string }) =>
    request<Persona[]>('/personas/suggest', { method: 'POST', body: JSON.stringify(input) }),

  // Batches
  createBatch: (input: { name: string; brief: Brief }) =>
    request<{ batchId: string; estimatedSeconds: number }>('/batches', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  // Ads
  approveAd: (adId: string) =>
    request<{ ok: true }>(`/ads/${adId}`, { method: 'PATCH', body: JSON.stringify({ status: 'approved' }) }),
  rejectAd: (adId: string) =>
    request<{ ok: true }>(`/ads/${adId}`, { method: 'PATCH', body: JSON.stringify({ status: 'rejected' }) }),
  bulkDecisions: (batchId: string, decisions: { adId: string; status: 'approved' | 'rejected' }[]) =>
    request<{ ok: true }>(`/batches/${batchId}/decisions`, {
      method: 'POST',
      body: JSON.stringify({ decisions }),
    }),

  // Revisions
  requestRevision: (adId: string, instruction: string) =>
    request<{ revisionId: string }>(`/ads/${adId}/revisions`, {
      method: 'POST',
      body: JSON.stringify({ instruction }),
    }),
  acceptRevision: (adId: string, revisionId: string) =>
    request<{ ok: true }>(`/ads/${adId}/revisions/${revisionId}/accept`, { method: 'POST' }),

  // Reads
  dashboardStats: () => request<DashboardStats>('/dashboard/stats'),
  signedUrl: (adId: string) => request<{ url: string; expiresIn: number }>(`/assets/${adId}/signed-url`),

  // Stubs
  campaignMetrics: (id: string, period: '7d' | '30d' | '90d' = '30d') =>
    request<any>(`/campaigns/${id}/metrics?period=${period}`),
  adIntelligence: (adId: string) => request<any>(`/ads/${adId}/intelligence`),
  playbook: () => request<any>('/playbook'),
  insights: () => request<any>('/insights'),
};

export { ApiClientError };
