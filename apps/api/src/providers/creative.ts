import OpenAI from 'openai';
import { config } from '../lib/config.js';
import { AppError } from '../lib/errors.js';
import type { CreativeProvider } from './types.js';

// kie.ai exposes an OpenAI-compatible `/v1/images/generations` endpoint
// across multiple image models (FLUX, Recraft, DALL-E, etc.).
// Reuse the OpenAI SDK pointed at kie.ai.
const client = new OpenAI({
  apiKey: config.kieKey,
  baseURL: config.kieBaseUrl,
});

export const kieCreativeProvider: CreativeProvider = {
  async kickoff(brief, platform, copy) {
    if (!config.kieKey) throw AppError.provider('KIE_API_KEY not set');
    const prompt = [
      `Ad creative for ${platform}.`,
      `Headline: ${copy.headline}.`,
      `Body: ${copy.body}.`,
      `Hook: ${copy.hook}.`,
      `Visual style: ${brief.creativeStyle}.`,
      `Tone: ${brief.tones.join(', ')}.`,
    ].join(' ');

    try {
      const resp = await client.images.generate({
        model: config.kieImageModel,
        prompt,
        size: '1024x1024',
        n: 1,
      });
      const url = resp.data?.[0]?.url;
      if (!url) throw new Error('Provider returned no image URL');
      return { assetUrl: url };
    } catch (e) {
      throw AppError.provider(`kie.ai image: ${(e as Error).message}`);
    }
  },

  // kie.ai image generation is synchronous in our usage.
  // pollJob remains on the interface for future async video models.
  async pollJob() {
    return { status: 'ready' };
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
  if (config.isEmulator() || !config.kieKey) return fakeCreativeProvider;
  return kieCreativeProvider;
}
