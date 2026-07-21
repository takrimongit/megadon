import type { Ad } from '@megadon/types';
import { useAdAssetUrl } from '../lib/useSignedUrl';

// Display aspect (width / height) mirroring the backend's per-platform choices:
// designed image ads are 4:5 (feed) or 9:16 (short-form); video is 16:9 (feed)
// or 9:16 (short-form). Lets the frame match the ad so nothing is cropped.
function frameAspect(ad: { mediaType?: 'image' | 'video'; platform?: string }): number {
  const p = ad.platform;
  if (ad.mediaType === 'video') return p === 'youtube' || p === 'linkedin' || p === 'facebook' ? 16 / 9 : 9 / 16;
  if (p === 'tiktok' || p === 'youtube') return 9 / 16;
  if (p === 'instagram' || p === 'facebook') return 4 / 5;
  return 1;
}

/**
 * Renders an ad's creative — image or inline video — from its signed URL.
 * Cache is keyed by assetPath so accepting a revision busts stale media.
 * `matchAspect` sizes the frame to the ad's real ratio (uncropped review view).
 */
export function AdMedia({
  ad,
  controls = false,
  overlay,
  matchAspect = false,
}: {
  ad: Pick<Ad, 'id' | 'mediaType' | 'assetPath' | 'headline' | 'status' | 'platform'>;
  controls?: boolean;
  overlay?: React.ReactNode;
  matchAspect?: boolean;
}) {
  const { url } = useAdAssetUrl(ad.assetPath ? ad.id : undefined, ad.assetPath);

  return (
    <div className="ad-tile" style={matchAspect ? { aspectRatio: String(frameAspect(ad)) } : undefined}>
      {!ad.assetPath ? (
        <div className="center-fill" style={{ minHeight: 0, height: '100%' }}>
          {ad.status === 'failed' ? (
            <span className="sub">Generation failed</span>
          ) : (
            <div className="spinner" />
          )}
        </div>
      ) : !url ? (
        <div className="center-fill" style={{ minHeight: 0, height: '100%' }}>
          <div className="spinner" />
        </div>
      ) : ad.mediaType === 'video' ? (
        <video src={url} controls={controls} muted loop playsInline autoPlay={!controls} />
      ) : (
        <img src={url} alt={ad.headline ?? 'Ad creative'} loading="lazy" />
      )}
      {overlay}
    </div>
  );
}
