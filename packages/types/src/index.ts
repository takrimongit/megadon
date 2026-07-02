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

export const MediaType = z.enum(['image', 'video']);
export type MediaType = z.infer<typeof MediaType>;

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
  /** What kind of asset to generate. Defaults to image for back-compat. */
  mediaType: MediaType.default('image'),
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

// ============ Publishing (organic Facebook Page + Instagram) ============

export const PublishPlatform = z.enum(['facebook', 'instagram']);
export type PublishPlatform = z.infer<typeof PublishPlatform>;

export const PublishTargetStatus = z.enum(['pending', 'published', 'failed']);
export type PublishTargetStatus = z.infer<typeof PublishTargetStatus>;

/** Per-destination outcome of a publish attempt, stored on the ad. */
export const PublishTargetResult = z.object({
  platform: PublishPlatform,
  status: PublishTargetStatus,
  /** Remote post/media id returned by Meta. */
  remoteId: z.string().optional(),
  permalink: z.string().optional(),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
  publishedAt: z.string().optional(),
});
export type PublishTargetResult = z.infer<typeof PublishTargetResult>;

export const PublishStatus = z.enum([
  'not_published',
  'publishing',
  'published',
  'partial', // some targets succeeded, some failed
  'failed',
]);
export type PublishStatus = z.infer<typeof PublishStatus>;

export const AdPublish = z.object({
  status: PublishStatus,
  targets: z.array(PublishTargetResult).default([]),
  requestedBy: z.string().optional(),
  updatedAt: z.string(),
});
export type AdPublish = z.infer<typeof AdPublish>;

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
  mediaType: MediaType.default('image'),
  /** GCS path for the final asset (jpg for image, mp4 for video). */
  assetPath: z.string().optional(),
  providerJobId: z.string().optional(),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
  history: z.array(z.object({
    headline: z.string().optional(),
    body: z.string().optional(),
    cta: z.string().optional(),
    revisedAt: z.string(),
  })).default([]),
  /** Set once the ad has been (or is being) pushed to social platforms. */
  publish: AdPublish.optional(),
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
  assetPath: z.string().optional(),
  providerJobId: z.string().optional(),
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

// ============ Meta publishing settings ============

/**
 * Per-workspace Meta connection. The Page access token itself is NEVER
 * stored here or returned by the API — it lives in Secret Manager.
 * `tokenSet` only reflects whether a token has been saved.
 */
export const MetaSettings = z.object({
  connected: z.boolean().default(false),
  facebookPageId: z.string().optional(),
  pageName: z.string().optional(),
  /** Instagram Business/Creator account id linked to the Page. */
  instagramUserId: z.string().optional(),
  tokenSet: z.boolean().default(false),
  updatedAt: z.string(),
});
export type MetaSettings = z.infer<typeof MetaSettings>;

export const UpdateMetaSettingsBody = z.object({
  facebookPageId: z.string().optional(),
  pageName: z.string().optional(),
  instagramUserId: z.string().optional(),
  /** Write-only long-lived Page access token; stored in Secret Manager. */
  pageAccessToken: z.string().min(1).optional(),
});
export type UpdateMetaSettingsBody = z.infer<typeof UpdateMetaSettingsBody>;

export const PublishAdBody = z.object({
  targets: z.array(PublishPlatform).min(1),
});
export type PublishAdBody = z.infer<typeof PublishAdBody>;

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

// ============ Brand Playbook ============

export const BrandAssetType = z.enum([
  'logo',
  'guideline',     // PDF
  'image',         // general brand image
  'product',
  'previous_ad',
  'social',
]);
export type BrandAssetType = z.infer<typeof BrandAssetType>;

export const BrandAsset = z.object({
  id: z.string(),
  type: BrandAssetType,
  path: z.string(),       // GCS object path
  mimeType: z.string(),
  filename: z.string().optional(),
  uploadedAt: z.string(),
});
export type BrandAsset = z.infer<typeof BrandAsset>;

export const BrandInfo = z.object({
  companyName: z.string().min(1),
  websiteUrl: z.string().optional(),
  industry: z.string().min(1),
  description: z.string().min(10),
});
export type BrandInfo = z.infer<typeof BrandInfo>;

export const BrandColor = z.object({
  hex: z.string(),
  name: z.string(),
  role: z.string().optional(),     // e.g. "primary", "accent"
});
export type BrandColor = z.infer<typeof BrandColor>;

export const BrandConfidence = z.object({
  colors: z.number().min(0).max(1).default(0),
  personality: z.number().min(0).max(1).default(0),
  toneOfVoice: z.number().min(0).max(1).default(0),
  visualStyle: z.number().min(0).max(1).default(0),
  audience: z.number().min(0).max(1).default(0),
});
export type BrandConfidence = z.infer<typeof BrandConfidence>;

export const BrandAnalysis = z.object({
  colors: z.array(BrandColor).default([]),
  personality: z.array(z.string()).default([]),       // ["Innovative", "Trustworthy", ...]
  toneOfVoice: z.string().default(''),                 // free-form
  visualStyle: z.string().default(''),
  targetAudience: z.string().default(''),
  creativeStyles: z.array(z.string()).default([]),     // approved style chips
  brandRules: z.array(z.string()).default([]),         // dos / don'ts
  messagingStyle: z.string().default(''),
  ctaPreferences: z.array(z.string()).default([]),
  confidence: BrandConfidence.default({
    colors: 0, personality: 0, toneOfVoice: 0, visualStyle: 0, audience: 0,
  }),
});
export type BrandAnalysis = z.infer<typeof BrandAnalysis>;

export const BrandPlaybookStatus = z.enum([
  'empty',         // no info yet (default state for a workspace)
  'draft',         // info saved, no analysis yet
  'analyzing',     // worker is running
  'ready',         // analysis done, awaiting user review/approval
  'approved',      // user signed off; used in ad generation
  'failed',
]);
export type BrandPlaybookStatus = z.infer<typeof BrandPlaybookStatus>;

export const BrandPlaybook = z.object({
  workspaceId: z.string(),
  status: BrandPlaybookStatus,
  info: BrandInfo.nullable().default(null),
  assets: z.array(BrandAsset).default([]),
  analysis: BrandAnalysis.nullable().default(null),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  approvedAt: z.string().nullable().default(null),
});
export type BrandPlaybook = z.infer<typeof BrandPlaybook>;

// Request bodies
export const UpdateBrandInfoBody = BrandInfo;

export const RequestUploadUrlBody = z.object({
  type: BrandAssetType,
  mimeType: z.string().min(1),
  filename: z.string().optional(),
});

export const RegisterAssetBody = z.object({
  type: BrandAssetType,
  path: z.string().min(1),
  mimeType: z.string().min(1),
  filename: z.string().optional(),
});

export const UpdatePlaybookBody = z.object({
  analysis: BrandAnalysis.partial().optional(),
});

// ============ Geek Mode (advanced AI overrides) ============

/**
 * A chat-style AI surface override. If `model` is set it replaces the
 * default model id; if `systemPrompt` is set it replaces the system
 * message (the user-side message is still composed from the runtime
 * context like Brief + brand info).
 */
export const GeekChatOverride = z.object({
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
});
export type GeekChatOverride = z.infer<typeof GeekChatOverride>;

/**
 * Image / video override. promptTemplate uses mustache-style
 * `{{path.to.var}}` placeholders that the worker interpolates against
 * the runtime context (brief, brand, copy, revisionInstruction).
 */
export const GeekMediaOverride = z.object({
  model: z.string().optional(),
  promptTemplate: z.string().optional(),
});
export type GeekMediaOverride = z.infer<typeof GeekMediaOverride>;

export const GeekSettings = z.object({
  /** Master switch — when false, all overrides are ignored. */
  enabled: z.boolean().default(false),
  chat: GeekChatOverride.optional(),
  revise: GeekChatOverride.optional(),
  personas: GeekChatOverride.optional(),
  analyze: GeekChatOverride.optional(),
  image: GeekMediaOverride.optional(),
  video: GeekMediaOverride.optional(),
  updatedAt: z.string(),
});
export type GeekSettings = z.infer<typeof GeekSettings>;

export const UpdateGeekSettingsBody = z.object({
  enabled: z.boolean().optional(),
  chat: GeekChatOverride.optional(),
  revise: GeekChatOverride.optional(),
  personas: GeekChatOverride.optional(),
  analyze: GeekChatOverride.optional(),
  image: GeekMediaOverride.optional(),
  video: GeekMediaOverride.optional(),
});
export type UpdateGeekSettingsBody = z.infer<typeof UpdateGeekSettingsBody>;

// Defaults exposed by GET /v1/settings/geek/defaults so the mobile UI
// can show users the platform's built-in system prompts and suggested
// models — they can copy these and tweak them in Geek Mode.
export interface GeekChatDefault {
  systemPrompt: string;
  models: string[];
  defaultModel: string;
}
export interface GeekMediaDefault {
  promptTemplate: string;
  models: string[];
  defaultModel: string;
}
export interface GeekDefaults {
  chat: GeekChatDefault;
  revise: GeekChatDefault;
  personas: GeekChatDefault;
  analyze: GeekChatDefault;
  image: GeekMediaDefault;
  video: GeekMediaDefault;
  variables: {
    common: string[];
    brief: string[];
    copy: string[];
    brand: string[];
  };
  /** Per-model cost/time estimates so UIs can show "≈ N credits · ~Ms". */
  pricing: AiPricingTable;
}

// ============ AI usage metering ============

export type AiSurface = 'chat' | 'revise' | 'personas' | 'analyze' | 'image' | 'video';

/**
 * Best-effort estimates derived from kie.ai's published pricing
 * (1 credit ≈ $0.005). Estimates, not invoices — actuals come from the
 * kie.ai dashboard; the remaining-credit balance in UsageSummary is real.
 */
export interface ModelPricing {
  unit: 'call' | 'image' | 'video';
  estCredits: number;
  estUsd: number;
  /** Typical wall-clock seconds for one operation. */
  estSeconds: number;
}

export interface AiPricingTable {
  creditUsd: number;
  models: Record<string, ModelPricing>;
  /** Fallbacks when a user types a model id we don't know. */
  fallback: Record<'call' | 'image' | 'video', ModelPricing>;
}

export interface UsageEntry {
  surface: AiSurface;
  model: string;
  units: number;
  estCredits: number;
  estUsd: number;
  batchId?: string;
  adId?: string;
  createdAt: string;
}

export interface UsageBucket {
  key: string;
  operations: number;
  estCredits: number;
  estUsd: number;
}

export interface UsageSummary {
  windowDays: number;
  /** Real remaining credit balance from kie.ai, null if unavailable. */
  creditsRemaining: number | null;
  creditsRemainingUsd: number | null;
  totals: { operations: number; estCredits: number; estUsd: number };
  byModel: UsageBucket[];
  bySurface: UsageBucket[];
}
