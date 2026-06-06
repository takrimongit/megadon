import { z } from 'zod';

// ============ Enums ============

export const Role = z.enum(['owner', 'editor', 'viewer']);
export type Role = z.infer<typeof Role>;

export const BatchStatus = z.enum([
  'queued',
  'generating',
  'pending_review',
  'approved',
  'archived',
  'failed',
]);
export type BatchStatus = z.infer<typeof BatchStatus>;

export const AdStatus = z.enum([
  'generating',
  'pending',
  'approved',
  'rejected',
  'failed',
]);
export type AdStatus = z.infer<typeof AdStatus>;

export const RevisionStatus = z.enum(['queued', 'generating', 'ready', 'failed']);
export type RevisionStatus = z.infer<typeof RevisionStatus>;

export const Platform = z.enum(['instagram', 'tiktok', 'facebook', 'youtube', 'linkedin']);
export type Platform = z.infer<typeof Platform>;

export const CampaignGoal = z.enum(['awareness', 'conversion', 'engagement', 'retention']);
export type CampaignGoal = z.infer<typeof CampaignGoal>;

export const VisualStyle = z.enum(['bold', 'minimal', 'warm', 'playful']);
export type VisualStyle = z.infer<typeof VisualStyle>;

// ============ Entities ============

export const User = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  createdAt: z.string(),
  defaultWorkspaceId: z.string().nullable(),
});
export type User = z.infer<typeof User>;

export const Workspace = z.object({
  id: z.string(),
  name: z.string(),
  ownerId: z.string(),
  plan: z.enum(['free', 'pro', 'enterprise']).default('free'),
  createdAt: z.string(),
});
export type Workspace = z.infer<typeof Workspace>;

export const Membership = z.object({
  uid: z.string(),
  role: Role,
  addedAt: z.string(),
});
export type Membership = z.infer<typeof Membership>;

export const Persona = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  tags: z.array(z.string()),
  reach: z.string(),
});
export type Persona = z.infer<typeof Persona>;

export const Brief = z.object({
  goal: CampaignGoal,
  audience: z.object({
    ageGroups: z.array(z.string()),
    interests: z.array(z.string()),
    personaDescription: z.string().optional(),
    selectedPersona: Persona.optional(),
  }),
  offer: z.string().min(5),
  platforms: z.array(Platform).min(1),
  batchSize: z.number().int().min(1).max(50),
  creativeStyle: VisualStyle,
  tones: z.array(z.string()),
});
export type Brief = z.infer<typeof Brief>;

export const BatchProgress = z.object({
  total: z.number().int(),
  completed: z.number().int(),
  failed: z.number().int().default(0),
});
export type BatchProgress = z.infer<typeof BatchProgress>;

export const BatchCounters = z.object({
  approved: z.number().int().default(0),
  rejected: z.number().int().default(0),
});
export type BatchCounters = z.infer<typeof BatchCounters>;

export const Batch = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  status: BatchStatus,
  brief: Brief,
  progress: BatchProgress,
  counters: BatchCounters,
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Batch = z.infer<typeof Batch>;

export const Ad = z.object({
  id: z.string(),
  batchId: z.string(),
  workspaceId: z.string(),
  headline: z.string().optional(),
  body: z.string().optional(),
  hook: z.string().optional(),
  cta: z.string().optional(),
  platform: Platform,
  format: z.string(),
  status: AdStatus,
  score: z.number().optional(),
  assetPath: z.string().optional(),
  providerJobId: z.string().optional(),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
  history: z.array(z.object({
    headline: z.string().optional(),
    body: z.string().optional(),
    cta: z.string().optional(),
    revisedAt: z.string(),
  })).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Ad = z.infer<typeof Ad>;

export const Revision = z.object({
  id: z.string(),
  adId: z.string(),
  instruction: z.string().min(1),
  status: RevisionStatus,
  headline: z.string().optional(),
  body: z.string().optional(),
  cta: z.string().optional(),
  accepted: z.boolean().default(false),
  createdBy: z.string(),
  createdAt: z.string(),
});
export type Revision = z.infer<typeof Revision>;

export const DashboardStats = z.object({
  activeCampaigns: z.number(),
  adsGenerated: z.number(),
  approvalRate: z.number(),
  avgRoas: z.number(),
});
export type DashboardStats = z.infer<typeof DashboardStats>;

// ============ Request/Response Schemas ============

export const CreateWorkspaceBody = z.object({ name: z.string().min(1) });
export const SuggestPersonasBody = z.object({
  ageGroups: z.array(z.string()),
  interests: z.array(z.string()),
  personaDescription: z.string().optional(),
});
export const CreateBatchBody = z.object({
  name: z.string().min(1),
  brief: Brief,
});
export const UpdateAdBody = z.object({
  status: z.enum(['approved', 'rejected']),
});
export const BulkDecisionsBody = z.object({
  decisions: z.array(z.object({
    adId: z.string(),
    status: z.enum(['approved', 'rejected']),
  })).min(1),
});
export const CreateRevisionBody = z.object({ instruction: z.string().min(1) });

// ============ API Envelope ============

export type ApiSuccess<T> = { data: T; error: null };
export type ApiError = { data: null; error: { code: string; message: string } };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export const ErrorCode = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  WORKSPACE_FORBIDDEN: 'WORKSPACE_FORBIDDEN',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  PROVIDER_FAILED: 'PROVIDER_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL: 'INTERNAL',
} as const;
export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];

// ============ Wizard Options (static config) ============

export const WizardOptions = z.object({
  goals: z.array(z.object({ id: CampaignGoal, label: z.string(), desc: z.string(), icon: z.string() })),
  ageGroups: z.array(z.string()),
  interests: z.array(z.string()),
  platforms: z.array(z.object({ id: Platform, label: z.string(), formats: z.string(), icon: z.string() })),
  visualStyles: z.array(z.object({ id: VisualStyle, label: z.string(), desc: z.string() })),
  tones: z.array(z.string()),
});
export type WizardOptions = z.infer<typeof WizardOptions>;
