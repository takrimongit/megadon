import type { Brief, Persona, Platform } from '@megadon/types';

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
  generateCopy(brief: Brief, platform: Platform): Promise<CopyResult>;
  reviseCopy(current: CopyResult, instruction: string, brief: Brief): Promise<CopyResult>;
  suggestPersonas(input: {
    ageGroups: string[];
    interests: string[];
    personaDescription?: string;
  }): Promise<Persona[]>;
}

export interface CreativeProvider {
  kickoff(brief: Brief, platform: Platform, copy: CopyResult): Promise<CreativeJobKickoff>;
  pollJob(jobId: string): Promise<CreativeJobStatus>;
}
