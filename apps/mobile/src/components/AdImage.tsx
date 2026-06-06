import React from 'react';
import { View, Image, StyleSheet, ImageStyle, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme';
import { useAdImageUrl } from '../lib/useAdImageUrl';

interface Props {
  adId: string;
  hasAsset: boolean;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  fallbackIconSize?: number;
}

/**
 * Renders an ad's primary asset via a 15-min signed URL. Falls back to an
 * icon when the ad is still generating or the asset hasn't been minted yet.
 */
export default function AdImage({ adId, hasAsset, style, imageStyle, fallbackIconSize = 32 }: Props) {
  const url = useAdImageUrl(adId, hasAsset);

  return (
    <View style={[styles.container, style]}>
      {url ? (
        <Image source={{ uri: url }} style={[StyleSheet.absoluteFill, imageStyle]} resizeMode="cover" />
      ) : (
        <MaterialIcons name="image" size={fallbackIconSize} color={Colors.outlineVariant} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
