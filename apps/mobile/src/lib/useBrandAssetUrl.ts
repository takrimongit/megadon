import { useEffect, useState } from 'react';
import { api } from './api';

// In-memory cache. Signed URLs live 15 min; expire 1 min early.
const cache = new Map<string, { url: string; expiresAt: number }>();
const TTL_MS = 14 * 60 * 1000;

/**
 * Fetches a signed read URL for a brand asset. Returns null while loading
 * or if the asset can't be resolved.
 */
export function useBrandAssetUrl(assetId: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => {
    if (!assetId) return null;
    const cached = cache.get(assetId);
    if (cached && cached.expiresAt > Date.now()) return cached.url;
    return null;
  });

  useEffect(() => {
    if (!assetId) {
      setUrl(null);
      return;
    }
    const cached = cache.get(assetId);
    if (cached && cached.expiresAt > Date.now()) {
      setUrl(cached.url);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { url } = await api.brandAssetSignedUrl(assetId);
        if (cancelled) return;
        cache.set(assetId, { url, expiresAt: Date.now() + TTL_MS });
        setUrl(url);
      } catch {
        if (!cancelled) setUrl(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assetId]);

  return url;
}
