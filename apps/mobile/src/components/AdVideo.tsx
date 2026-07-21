import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  StatusBar,
  ViewStyle,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useAdImageUrl } from '../lib/useAdImageUrl';
import { Colors } from '../theme';

interface Props {
  adId: string;
  hasAsset: boolean;
  assetVersion?: string | null;
  style?: ViewStyle;
  /** When true, tap-to-fullscreen is enabled. */
  zoomable?: boolean;
  /** Optional pre-fetched URL to skip the signed-URL fetch. */
  urlOverride?: string | null;
  /** When set, the frame sizes to this width/height ratio. See `adFrameAspect`. */
  frameAspect?: number;
}

/**
 * Inline auto-playing muted video tile with optional tap-to-fullscreen.
 * Uses the same signed-URL fetch + cache as AdImage so revisions invalidate
 * correctly via assetVersion.
 */
export default function AdVideo({
  adId,
  hasAsset,
  assetVersion,
  style,
  zoomable = false,
  urlOverride,
  frameAspect,
}: Props) {
  const fetched = useAdImageUrl(adId, hasAsset && urlOverride == null, assetVersion);
  const url = urlOverride ?? fetched;
  const [fullscreen, setFullscreen] = useState(false);
  const containerStyle = [styles.container, style, frameAspect ? { aspectRatio: frameAspect } : null];

  const player = useVideoPlayer(url ?? '', (p) => {
    p.loop = true;
    p.muted = true;
    if (url) p.play();
  });

  const fallback = (
    <View style={styles.fallback}>
      <MaterialIcons name="movie" size={32} color={Colors.outlineVariant} />
    </View>
  );

  const body = url ? (
    <View style={styles.frame}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />
      <View style={styles.videoBadge}>
        <MaterialIcons name="play-arrow" size={12} color={Colors.onPrimary} />
      </View>
    </View>
  ) : (
    fallback
  );

  if (!zoomable || !url) return <View style={containerStyle}>{body}</View>;

  return (
    <>
      <TouchableOpacity
        style={containerStyle}
        activeOpacity={0.85}
        onPress={() => {
          player.muted = false;
          setFullscreen(true);
        }}
      >
        {body}
      </TouchableOpacity>

      <Modal
        visible={fullscreen}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          player.muted = true;
          setFullscreen(false);
        }}
      >
        <StatusBar hidden />
        <View style={styles.modal}>
          <VideoView
            player={player}
            style={styles.fullscreenVideo}
            contentFit="contain"
            nativeControls
          />
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => {
              player.muted = true;
              setFullscreen(false);
            }}
          >
            <MaterialIcons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  frame: { ...StyleSheet.absoluteFill, backgroundColor: '#000' },
  fallback: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenVideo: { width: SCREEN_W, height: SCREEN_H },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
