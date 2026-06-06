import { useEffect, useState } from 'react';
import { api } from './api';

// In-memory cache. Signed URLs are valid for 15 minutes; we expire 1 minute early
// to stay safely within the validity window.
const cache = new Map<string, { url: string; expiresAt: number }>();
const TTL_MS = 14 * 60 * 1000;

/**
 * Fetches a signed read URL for an ad's primary asset. Returns null while
 * loading or if the ad has no asset yet (e.g. still generating).
 */
export function useAdImageUrl(adId: string | null | undefined, enabled = true): string | null {
  const [url, setUrl] = useState<string | null>(() => {
    if (!adId) return null;
    const cached = cache.get(adId);
    if (cached && cached.expiresAt > Date.now()) return cached.url;
    return null;
  });

  useEffect(() => {
    if (!adId || !enabled) {
      setUrl(null);
      return;
    }

    const cached = cache.get(adId);
    if (cached && cached.expiresAt > Date.now()) {
      setUrl(cached.url);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { url } = await api.signedUrl(adId);
        if (cancelled) return;
        cache.set(adId, { url, expiresAt: Date.now() + TTL_MS });
        setUrl(url);
      } catch {
        // Asset not ready yet — leave url null.
        if (!cancelled) setUrl(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [adId, enabled]);

  return url;
}
