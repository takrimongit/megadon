import React from 'react';
import { ImageStyle, ViewStyle } from 'react-native';
import AdImage from './AdImage';
import AdVideo from './AdVideo';

interface Props {
  adId: string;
  mediaType?: 'image' | 'video';
  hasAsset: boolean;
  assetVersion?: string | null;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  fallbackIconSize?: number;
  zoomable?: boolean;
  urlOverride?: string | null;
}

/**
 * Dispatches to AdImage or AdVideo based on the ad's mediaType.
 * Defaults to image for back-compat (existing ads without a mediaType).
 */
export default function AdMedia(props: Props) {
  if (props.mediaType === 'video') {
    return (
      <AdVideo
        adId={props.adId}
        hasAsset={props.hasAsset}
        assetVersion={props.assetVersion}
        style={props.style}
        zoomable={props.zoomable}
        urlOverride={props.urlOverride}
      />
    );
  }
  return <AdImage {...props} />;
}
