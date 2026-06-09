import { useEffect, useState } from 'react';
import { api } from './api';

// In-memory cache. Signed URLs are valid for 15 minutes; we expire 1 minute early
// to stay safely within the validity window.
const cache = new Map<string, { url: string; expiresAt: number }>();
const TTL_MS = 14 * 60 * 1000;

/**
 * Fetches a signed read URL for an ad's primary asset.
 *
 * @param adId          Ad doc id.
 * @param enabled       Skip the fetch entirely (e.g. ad still generating).
 * @param assetVersion  A value that changes whenever the underlying asset
 *                      changes (typically `ad.assetPath` or `ad.updatedAt`).
 *                      The cache is keyed by `${adId}|${assetVersion}` so an
 *                      accepted revision — which replaces ad.assetPath — busts
 *                      the cache and triggers a fresh signed URL fetch.
 *                      If omitted, the cache is keyed by adId alone (legacy).
 */
export function useAdImageUrl(
  adId: string | null | undefined,
  enabled = true,
  assetVersion?: string | null,
): string | null {
  const cacheKey = adId ? (assetVersion ? `${adId}|${assetVersion}` : adId) : null;

  const [url, setUrl] = useState<string | null>(() => {
    if (!cacheKey) return null;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.url;
    return null;
  });

  useEffect(() => {
    if (!adId || !enabled || !cacheKey) {
      setUrl(null);
      return;
    }

    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      setUrl(cached.url);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { url } = await api.signedUrl(adId);
        if (cancelled) return;
        cache.set(cacheKey, { url, expiresAt: Date.now() + TTL_MS });
        setUrl(url);
      } catch {
        // Asset not ready yet — leave url null.
        if (!cancelled) setUrl(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [adId, enabled, cacheKey]);

  return url;
}
