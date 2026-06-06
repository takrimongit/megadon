import { config } from '../lib/config.js';
import { AppError } from '../lib/errors.js';
import type { CreativeProvider } from './types.js';

const BASE = 'https://api.higgsfield.ai';

async function authedFetch(path: string, init: RequestInit = {}): Promise<any> {
  if (!config.higgsfieldKey) throw AppError.provider('HIGGSFIELD_API_KEY not set');
  const resp = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      'Authorization': `Bearer ${config.higgsfieldKey}`,
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) throw AppError.provider(`Higgsfield ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

export const higgsfieldProvider: CreativeProvider = {
  async kickoff(brief, platform, copy) {
    // Stubbed kickoff payload — real Higgsfield API surface differs;
    // adapt when integrating.
    const body = {
      prompt: `${copy.headline}. ${copy.body}. Style: ${brief.creativeStyle}. Platform: ${platform}.`,
      style: brief.creativeStyle,
      platform,
      dimensions: '1080x1080',
    };
    const json = await authedFetch('/v1/jobs', { method: 'POST', body: JSON.stringify(body) });
    if (json.status === 'ready' && json.assetUrl) return { assetUrl: json.assetUrl };
    return { jobId: json.id };
  },

  async pollJob(jobId) {
    const json = await authedFetch(`/v1/jobs/${jobId}`);
    if (json.status === 'ready') return { status: 'ready', assetUrl: json.assetUrl };
    if (json.status === 'failed') return { status: 'failed', error: json.error ?? 'Unknown' };
    return { status: 'pending' };
  },
};

// Fake provider used by tests & dev emulator runs — returns a static asset.
export const fakeCreativeProvider: CreativeProvider = {
  async kickoff() {
    return { assetUrl: 'https://placehold.co/1080x1080/3525cd/ffffff?text=AdForge' };
  },
  async pollJob() {
    return { status: 'ready', assetUrl: 'https://placehold.co/1080x1080/3525cd/ffffff?text=AdForge' };
  },
};

export function getCreativeProvider(): CreativeProvider {
  if (config.isEmulator() || !config.higgsfieldKey) return fakeCreativeProvider;
  return higgsfieldProvider;
}
