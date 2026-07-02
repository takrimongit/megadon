import { db, bucket } from '../lib/firebase.js';
import { getMetaProvider, type MetaPublishInput, type MetaPublishResult } from '../providers/meta.js';
import { loadMetaSettings } from '../lib/metaSettings.js';
import { getMetaToken } from '../lib/metaSecrets.js';
import { config } from '../lib/config.js';
import type { PublishPlatform, PublishTargetResult } from '@megadon/types';

interface JobPayload {
  workspaceId: string;
  batchId: string;
  adId: string;
  targets: PublishPlatform[];
  requestedBy?: string;
}

// Meta fetches the creative from a public URL, so we hand it a signed GCS read
// URL valid long enough for video transcoding on their side.
const SIGNED_URL_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function runPublishAd(payload: JobPayload) {
  const { workspaceId, batchId, adId, targets, requestedBy } = payload;
  const adRef = db().doc(`workspaces/${workspaceId}/batches/${batchId}/ads/${adId}`);
  const adSnap = await adRef.get();
  if (!adSnap.exists) throw new Error('Ad missing');
  const ad = adSnap.data()!;

  const now = () => new Date().toISOString();

  const fail = async (message: string) => {
    await adRef.update({
      publish: {
        status: 'failed',
        targets: targets.map((platform) => ({
          platform,
          status: 'failed' as const,
          error: { code: 'PUBLISH_FAILED', message },
        })),
        ...(requestedBy ? { requestedBy } : {}),
        updatedAt: now(),
      },
    });
  };

  if (ad.status !== 'approved') return fail('Ad is not approved');
  if (!ad.assetPath) return fail('Ad has no generated asset');

  const settings = await loadMetaSettings(workspaceId);
  if (!settings || !settings.connected) return fail('Meta account is not connected');

  const token = await getMetaToken(workspaceId);
  if (!token) return fail('Meta access token is not configured');

  const mediaType: 'image' | 'video' = ad.mediaType === 'video' ? 'video' : 'image';
  // The emulator storage host can't sign URLs, and the fake Meta provider
  // ignores the media URL anyway — so we only sign for real in prod/staging.
  const mediaUrl = config.isEmulator()
    ? `https://emulator.local/${ad.assetPath}`
    : (await bucket().file(ad.assetPath).getSignedUrl({
        action: 'read',
        expires: Date.now() + SIGNED_URL_TTL_MS,
      }))[0];

  const caption = [ad.headline, ad.body, ad.cta].filter(Boolean).join('\n\n');
  const input: MetaPublishInput = { caption, mediaUrl, mediaType };
  const provider = getMetaProvider();

  const results: PublishTargetResult[] = [];
  for (const platform of targets) {
    try {
      let res: MetaPublishResult;
      if (platform === 'facebook') {
        if (!settings.facebookPageId) throw new Error('No Facebook Page connected');
        res = await provider.publishToFacebook(settings.facebookPageId, token, input);
      } else {
        if (!settings.instagramUserId) throw new Error('No Instagram account connected');
        res = await provider.publishToInstagram(settings.instagramUserId, token, input);
      }
      results.push({
        platform,
        status: 'published',
        remoteId: res.remoteId,
        ...(res.permalink ? { permalink: res.permalink } : {}),
        publishedAt: now(),
      });
    } catch (e) {
      results.push({
        platform,
        status: 'failed',
        error: { code: 'PUBLISH_FAILED', message: e instanceof Error ? e.message : String(e) },
      });
    }
  }

  const published = results.filter((r) => r.status === 'published').length;
  const status =
    published === 0 ? 'failed' : published === results.length ? 'published' : 'partial';

  await adRef.update({
    publish: {
      status,
      targets: results,
      ...(requestedBy ? { requestedBy } : {}),
      updatedAt: now(),
    },
    updatedAt: now(),
  });
}
