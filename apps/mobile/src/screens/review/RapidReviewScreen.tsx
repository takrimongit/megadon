import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import type { Ad } from '@megadon/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorView from '../../components/ErrorView';
import AdImage from '../../components/AdImage';
import { RootStackParamList } from '../../navigation';
import { getDb } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { api } from '../../lib/api';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'RapidReview'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

export default function RapidReviewScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { workspaceId } = useAuth();
  const { batchId } = route.params;
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [approved, setApproved] = useState(0);
  const [rejected, setRejected] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;

  useEffect(() => {
    if (!workspaceId) return;
    const adsRef = collection(getDb(), `workspaces/${workspaceId}/batches/${batchId}/ads`);
    const q = query(adsRef, where('status', '==', 'pending'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setAds(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Ad));
        setLoading(false);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      },
    );
    return unsub;
  }, [workspaceId, batchId]);

  const queue = useMemo(() => ads, [ads]);

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  const swipe = (direction: 'left' | 'right') => {
    const currentAd = queue[index];
    if (!currentAd) return;
    const toX = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
    Animated.timing(position, { toValue: { x: toX, y: 0 }, duration: 250, useNativeDriver: false }).start(async () => {
      try {
        if (direction === 'right') {
          await api.approveAd(currentAd.id);
          setApproved((a) => a + 1);
        } else {
          await api.rejectAd(currentAd.id);
          setRejected((r) => r + 1);
        }
      } catch {
        // Best-effort: leave the UI counter unchanged if write fails. The
        // Firestore listener will reconcile by re-adding the ad to the queue.
      }
      position.setValue({ x: 0, y: 0 });
      setIndex((i) => i + 1);
    });
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => position.setValue({ x: gesture.dx, y: gesture.dy }),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > SWIPE_THRESHOLD) swipe('right');
      else if (gesture.dx < -SWIPE_THRESHOLD) swipe('left');
      else Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
    },
  });

  const currentAd = queue[index];
  const done = !loading && (!currentAd || index >= queue.length);
  const total = queue.length + approved + rejected;

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <AppHeader showBack onBack={() => navigation.goBack()} title="Rapid Review" />
        <ErrorView message={error} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AppHeader showBack onBack={() => navigation.goBack()} title="Rapid Review" />
      <View style={styles.scoreBar}>
        <View style={styles.scoreItem}>
          <MaterialIcons name="check-circle" size={16} color={Colors.success} />
          <Text style={styles.scoreText}>{approved} approved</Text>
        </View>
        <Text style={styles.progressText}>{Math.min(approved + rejected, total)} / {total}</Text>
        <View style={styles.scoreItem}>
          <MaterialIcons name="cancel" size={16} color={Colors.error} />
          <Text style={styles.scoreText}>{rejected} rejected</Text>
        </View>
      </View>

      <View style={styles.cardArea}>
        {loading ? (
          <LoadingSpinner label="Loading ads…" />
        ) : done ? (
          <View style={styles.doneCard}>
            <MaterialIcons name="celebration" size={48} color={Colors.primary} />
            <Text style={styles.doneTitle}>All caught up!</Text>
            <Text style={styles.doneSubtitle}>{approved} approved · {rejected} rejected</Text>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backBtnText}>Back to Batch</Text>
            </TouchableOpacity>
          </View>
        ) : currentAd ? (
          <Animated.View
            {...panResponder.panHandlers}
            style={[styles.card, { transform: [...position.getTranslateTransform(), { rotate }] }]}
          >
            <View style={styles.adPreview}>
              <AdImage
                adId={currentAd.id}
                hasAsset={!!currentAd.assetPath}
                style={StyleSheet.absoluteFill as never}
                fallbackIconSize={48}
              />
              <View style={styles.adOverlay}>
                {currentAd.hook ? <Text style={styles.adHook}>{currentAd.hook}</Text> : null}
                <Text style={styles.adHeadline}>{currentAd.headline ?? '—'}</Text>
                {currentAd.cta ? (
                  <View style={styles.ctaBtn}>
                    <Text style={styles.ctaText}>{currentAd.cta}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.platformText}>{currentAd.platform} · {currentAd.format}</Text>
            </View>
          </Animated.View>
        ) : null}
      </View>

      {!done && !loading && currentAd && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.rejectBtn} onPress={() => swipe('left')}>
            <MaterialIcons name="close" size={28} color={Colors.error} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.reviseBtn} onPress={() => navigation.navigate('AIRevision', { adId: currentAd.id, batchId })}>
            <MaterialIcons name="edit" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.approveBtn} onPress={() => swipe('right')}>
            <MaterialIcons name="check" size={28} color={Colors.success} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scoreBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.sm,
  },
  scoreItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scoreText: { ...Typography.labelCaps, color: Colors.onSurfaceVariant },
  progressText: { ...Typography.labelCaps, color: Colors.primary, fontWeight: '700' },
  cardArea: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  card: {
    width: '100%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  adPreview: {
    height: 360,
    backgroundColor: Colors.surfaceContainerHigh,
    position: 'relative',
  },
  adOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.xl,
    gap: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  adHook: { ...Typography.bodyBase, color: Colors.onPrimary, textAlign: 'center' },
  adHeadline: { ...Typography.headlineMd, color: Colors.onPrimary, textAlign: 'center' },
  ctaBtn: {
    alignSelf: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: Radius.DEFAULT,
  },
  ctaText: { ...Typography.titleMd, color: Colors.onPrimary },
  cardFooter: { padding: Spacing.md, alignItems: 'center' },
  platformText: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, textTransform: 'uppercase' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
  },
  rejectBtn: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.error + '1A',
    borderWidth: 2, borderColor: Colors.error + '33',
    alignItems: 'center', justifyContent: 'center',
  },
  reviseBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
  },
  approveBtn: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.success + '1A',
    borderWidth: 2, borderColor: Colors.success + '33',
    alignItems: 'center', justifyContent: 'center',
  },
  doneCard: {
    alignItems: 'center', gap: Spacing.md,
    padding: Spacing.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    width: '100%',
  },
  doneTitle: { ...Typography.headlineMd, color: Colors.onSurface },
  doneSubtitle: { ...Typography.bodyBase, color: Colors.onSurfaceVariant },
  backBtn: {
    paddingHorizontal: Spacing.lg, paddingVertical: 12,
    backgroundColor: Colors.primaryFixed, borderRadius: Radius.DEFAULT,
  },
  backBtnText: { ...Typography.titleMd, color: Colors.primary },
});
