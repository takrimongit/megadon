import type {
  ApiResponse,
  Workspace,
  Persona,
  Brief,
  DashboardStats,
  WizardOptions,
  BrandPlaybook,
  BrandInfo,
  BrandAsset,
  BrandAssetType,
  BrandAnalysis,
  GeekSettings,
  UpdateGeekSettingsBody,
  GeekDefaults,
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
    ...((init.headers as Record<string, string>) ?? {}),
  };
  // Only declare JSON content-type when we're actually sending a body.
  // Fastify's strict JSON parser rejects an empty body with this header set.
  if (init.body != null) {
    headers['Content-Type'] = 'application/json';
  }
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
  revisionSignedUrl: (adId: string, revisionId: string) =>
    request<{ url: string; expiresIn: number }>(`/ads/${adId}/revisions/${revisionId}/signed-url`),

  // Brand Playbook (onboarding)
  getBrandPlaybook: () => request<BrandPlaybook>('/brand/playbook'),
  updateBrandInfo: (info: BrandInfo) =>
    request<BrandPlaybook>('/brand/info', { method: 'PUT', body: JSON.stringify(info) }),
  requestBrandUploadUrl: (type: BrandAssetType, mimeType: string, filename?: string) =>
    request<{ url: string; assetPath: string; assetId: string; expiresIn: number }>(
      '/brand/assets/signed-upload',
      { method: 'POST', body: JSON.stringify({ type, mimeType, filename }) },
    ),
  registerBrandAsset: (input: { type: BrandAssetType; path: string; mimeType: string; filename?: string }) =>
    request<BrandAsset>('/brand/assets/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  deleteBrandAsset: (assetId: string) =>
    request<{ ok: true }>(`/brand/assets/${assetId}`, { method: 'DELETE' }),
  brandAssetSignedUrl: (assetId: string) =>
    request<{ url: string; expiresIn: number }>(`/brand/assets/${assetId}/signed-url`),
  analyzeBrand: () =>
    request<{ ok: true; estimatedSeconds: number }>('/brand/analyze', { method: 'POST' }),
  updateBrandPlaybook: (updates: { analysis?: Partial<BrandAnalysis> }) =>
    request<BrandPlaybook>('/brand/playbook', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  approveBrandPlaybook: () =>
    request<{ ok: true }>('/brand/playbook/approve', { method: 'POST' }),

  // Stubs
  campaignMetrics: (id: string, period: '7d' | '30d' | '90d' = '30d') =>
    request<CampaignMetricsResponse>(`/campaigns/${id}/metrics?period=${period}`),
  adIntelligence: (adId: string) =>
    request<AdIntelligenceResponse>(`/ads/${adId}/intelligence`),
  playbook: () => request<PlaybookResponse>('/playbook'),
  insights: () => request<InsightsResponse>('/insights'),

  // Geek Mode settings
  getGeekDefaults: () =>
    request<GeekDefaults>('/settings/geek/defaults', {}, { requireWorkspace: false }),
  getGeekSettings: () => request<GeekSettings>('/settings/geek'),
  updateGeekSettings: (body: Partial<UpdateGeekSettingsBody> & { enabled?: boolean }) =>
    request<GeekSettings>('/settings/geek', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
};

export interface InsightItem {
  icon: string;
  label: string;
  value: string;
  trend: string;
  positive: boolean;
}
export interface InsightsResponse {
  insights: InsightItem[];
}

export interface CampaignMetricsResponse {
  campaignId: string;
  period: string;
  metrics: {
    impressions: number;
    clicks: number;
    ctr: number;
    roas: number;
    spend: number;
    conversions: number;
  };
  topAds: { id: string; headline: string; roas: string; ctr: string }[];
}

export interface AdIntelligenceResponse {
  adId: string;
  metrics: { roas: string; ctr: string; impressions: string; conversions: number };
  audienceBreakdown: { label: string; share: number }[];
  aiNotes: string[];
}

export interface PlaybookRule {
  icon: string;
  title: string;
  value: string;
  confidence: number;
}
export interface PlaybookResponse {
  lastUpdated: string;
  campaignCount: number;
  adCount: number;
  rules: PlaybookRule[];
}

export { ApiClientError };
