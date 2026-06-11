import { useEffect, useState } from 'react';
import { api } from './api';

// Signed URL caches keyed by id + assetVersion so a revised ad busts the
// cache (same fix as mobile's useAdImageUrl assetVersion param).
const adUrlCache = new Map<string, string>();
const brandUrlCache = new Map<string, string>();

export function useAdAssetUrl(adId: string | undefined, assetVersion?: string) {
  const [url, setUrl] = useState<string | null>(() =>
    adId ? adUrlCache.get(`${adId}:${assetVersion ?? ''}`) ?? null : null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!adId) return;
    const key = `${adId}:${assetVersion ?? ''}`;
    const cached = adUrlCache.get(key);
    if (cached) {
      setUrl(cached);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .signedUrl(adId)
      .then((r) => {
        if (cancelled) return;
        adUrlCache.set(key, r.url);
        setUrl(r.url);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [adId, assetVersion]);

  return { url, loading };
}

export function useRevisionAssetUrl(adId: string | undefined, revisionId: string | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!adId || !revisionId) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    api
      .revisionSignedUrl(adId, revisionId)
      .then((r) => {
        if (!cancelled) setUrl(r.url);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [adId, revisionId]);
  return url;
}

export function useBrandAssetUrl(assetId: string | undefined) {
  const [url, setUrl] = useState<string | null>(() =>
    assetId ? brandUrlCache.get(assetId) ?? null : null,
  );
  useEffect(() => {
    if (!assetId) return;
    const cached = brandUrlCache.get(assetId);
    if (cached) {
      setUrl(cached);
      return;
    }
    let cancelled = false;
    api
      .brandAssetSignedUrl(assetId)
      .then((r) => {
        if (cancelled) return;
        brandUrlCache.set(assetId, r.url);
        setUrl(r.url);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [assetId]);
  return url;
}
