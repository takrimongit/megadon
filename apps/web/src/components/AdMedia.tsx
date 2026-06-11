import type { Ad } from '@megadon/types';
import { useAdAssetUrl } from '../lib/useSignedUrl';

/**
 * Renders an ad's creative — image or inline video — from its signed URL.
 * Cache is keyed by assetPath so accepting a revision busts stale media.
 */
export function AdMedia({
  ad,
  controls = false,
  overlay,
}: {
  ad: Pick<Ad, 'id' | 'mediaType' | 'assetPath' | 'headline' | 'status'>;
  controls?: boolean;
  overlay?: React.ReactNode;
}) {
  const { url } = useAdAssetUrl(ad.assetPath ? ad.id : undefined, ad.assetPath);

  return (
    <div className="ad-tile">
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
