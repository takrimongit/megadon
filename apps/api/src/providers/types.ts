import type { Brief, Persona, Platform, BrandAnalysis, BrandInfo, BrandAsset } from '@megadon/types';

export interface BrandContext {
  info: BrandInfo;
  analysis: BrandAnalysis;
  assets?: BrandAsset[];
}

export interface CopyResult {
  headline: string;
  body: string;
  hook: string;
  cta: string;
}

export interface CreativeJobKickoff {
  /** Synchronous result if the provider returned the asset immediately. */
  assetUrl?: string;
  /** Otherwise a job id we'll poll for. */
  jobId?: string;
}

export interface CreativeJobStatus {
  status: 'pending' | 'ready' | 'failed';
  assetUrl?: string;
  error?: string;
}

export interface CopyProvider {
  generateCopy(brief: Brief, platform: Platform, brand?: BrandContext | null): Promise<CopyResult>;
  reviseCopy(current: CopyResult, instruction: string, brief: Brief, brand?: BrandContext | null): Promise<CopyResult>;
  suggestPersonas(input: {
    ageGroups: string[];
    interests: string[];
    personaDescription?: string;
  }): Promise<Persona[]>;
}

export interface CreativeKickoffOptions {
  /** When set, the prompt includes this as a "revision directive"
   * appended after all brand sections — so on-brand constraints
   * still apply and the model just steers per the user's note. */
  revisionInstruction?: string;
}

export interface CreativeProvider {
  kickoff(
    brief: Brief,
    platform: Platform,
    copy: CopyResult,
    brand?: BrandContext | null,
    opts?: CreativeKickoffOptions,
  ): Promise<CreativeJobKickoff>;
  pollJob(jobId: string): Promise<CreativeJobStatus>;
}

/** Video provider — async only. Returns mp4 URL. */
export interface VideoProvider {
  kickoff(
    brief: Brief,
    platform: Platform,
    copy: CopyResult,
    brand?: BrandContext | null,
    opts?: CreativeKickoffOptions,
  ): Promise<CreativeJobKickoff>;
  pollJob(jobId: string): Promise<CreativeJobStatus>;
}
