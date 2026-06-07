import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  ImageStyle,
  ViewStyle,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme';
import { useAdImageUrl } from '../lib/useAdImageUrl';

interface Props {
  adId: string;
  hasAsset: boolean;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  fallbackIconSize?: number;
  /** When true, tapping the image opens a full-screen pinch-to-zoom viewer. */
  zoomable?: boolean;
  /** Optional pre-fetched URL to display instead of fetching by adId. */
  urlOverride?: string | null;
}

/**
 * Renders an ad's primary asset via a 15-min signed URL. Falls back to an
 * icon when the ad is still generating or the asset hasn't been minted yet.
 */
export default function AdImage({
  adId,
  hasAsset,
  style,
  imageStyle,
  fallbackIconSize = 32,
  zoomable = false,
  urlOverride,
}: Props) {
  const fetched = useAdImageUrl(adId, hasAsset && urlOverride == null);
  const url = urlOverride ?? fetched;
  const [zoomOpen, setZoomOpen] = useState(false);

  const body = url ? (
    <Image source={{ uri: url }} style={[StyleSheet.absoluteFill, imageStyle]} resizeMode="cover" />
  ) : (
    <MaterialIcons name="image" size={fallbackIconSize} color={Colors.outlineVariant} />
  );

  const content = zoomable && url ? (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => setZoomOpen(true)}
      style={[styles.container, style]}
    >
      {body}
    </TouchableOpacity>
  ) : (
    <View style={[styles.container, style]}>{body}</View>
  );

  return (
    <>
      {content}
      {zoomable && url ? (
        <Modal
          visible={zoomOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setZoomOpen(false)}
          statusBarTranslucent
        >
          <StatusBar barStyle="light-content" />
          <View style={styles.zoomBackdrop}>
            <ScrollView
              style={styles.zoomScroll}
              contentContainerStyle={styles.zoomContent}
              maximumZoomScale={4}
              minimumZoomScale={1}
              centerContent
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              bouncesZoom
            >
              <Image source={{ uri: url }} style={styles.zoomImage} resizeMode="contain" />
            </ScrollView>
            <TouchableOpacity
              onPress={() => setZoomOpen(false)}
              style={styles.zoomClose}
              hitSlop={12}
            >
              <MaterialIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  zoomBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  zoomScroll: { flex: 1 },
  zoomContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomImage: {
    width: SCREEN_W,
    height: SCREEN_H,
  },
  zoomClose: {
    position: 'absolute',
    top: 56,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
