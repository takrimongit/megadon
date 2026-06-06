import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import type { Ad, Batch } from '@megadon/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import PrimaryButton from '../../components/PrimaryButton';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorView from '../../components/ErrorView';
import AdImage from '../../components/AdImage';
import { RootStackParamList } from '../../navigation';
import { getDb } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'BatchGenerating'>;

const visualStyleLabels: Record<string, string> = {
  bold: 'Bold & Energetic',
  minimal: 'Minimal & Clean',
  warm: 'Warm & Authentic',
  playful: 'Playful & Fun',
};

export default function BatchGeneratingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { workspaceId } = useAuth();
  const { batchId } = route.params;
  const [batch, setBatch] = useState<Batch | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const [error, setError] = useState<string | null>(null);
  const arcAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!workspaceId) return;
    const batchRef = doc(getDb(), `workspaces/${workspaceId}/batches/${batchId}`);
    const unsubBatch = onSnapshot(
      batchRef,
      (snap) => {
        if (snap.exists()) setBatch({ id: snap.id, ...snap.data() } as Batch);
      },
      (e) => setError(e.message),
    );
    const adsRef = collection(getDb(), `workspaces/${workspaceId}/batches/${batchId}/ads`);
    const unsubAds = onSnapshot(
      adsRef,
      (snap) => setAds(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Ad)),
      () => {},
    );
    return () => {
      unsubBatch();
      unsubAds();
    };
  }, [workspaceId, batchId]);

  const total = batch?.progress.total ?? 0;
  const completed = batch?.progress.completed ?? 0;
  const pct = total > 0 ? completed / total : 0;

  useEffect(() => {
    Animated.timing(arcAnim, { toValue: pct * 100, duration: 800, useNativeDriver: false, easing: Easing.out(Easing.quad) }).start();
  }, [pct, arcAnim]);

  useEffect(() => {
    if (batch?.status === 'pending_review' || batch?.status === 'approved') {
      navigation.replace('ReviewBatch', { batchId });
    }
  }, [batch?.status, batchId, navigation]);

  const displayProgress = Math.round(pct * 100);
  const arcRotation = arcAnim.interpolate({ inputRange: [0, 100], outputRange: ['0deg', '360deg'] });

  const reasoningLog = useMemo(() => {
    const lines: { type: 'system' | 'cmd'; text: string }[] = [
      { type: 'system', text: 'Initializing generative engine...' },
      { type: 'cmd', text: '>> Synthesizing campaign hooks...' },
    ];
    ads
      .slice()
      .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
      .forEach((ad, i) => {
        if (ad.status === 'generating') {
          lines.push({ type: 'cmd', text: `>> Iterating on creative variant #${i + 1}...` });
        } else if (ad.status === 'pending' || ad.status === 'approved') {
          lines.push({ type: 'cmd', text: `>> Rendered variant #${i + 1} (${ad.platform})` });
        } else if (ad.status === 'failed') {
          lines.push({ type: 'cmd', text: `>> Variant #${i + 1} failed — skipping` });
        }
      });
    return lines.slice(-10);
  }, [ads]);

  const visualStyleLabel = batch?.brief?.creativeStyle
    ? visualStyleLabels[batch.brief.creativeStyle] ?? batch.brief.creativeStyle
    : '—';

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader showBack onBack={() => navigation.goBack()} />
        <ErrorView message={error} onRetry={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  if (!batch) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader showBack onBack={() => navigation.goBack()} />
        <LoadingSpinner label="Loading batch…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader showBack onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.batchBadge}>
          <Text style={styles.batchBadgeText}>ACTIVE BATCH: {batchId.slice(0, 8)}</Text>
        </View>

        <Text style={styles.title}>Generating {total} Unique Variants</Text>
        <Text style={styles.subtitle}>Our AI is synthesizing visual hooks and platform-specific layouts.</Text>

        {/* Circular progress */}
        <View style={styles.circleContainer}>
          <View style={styles.circleTrack}>
            <Animated.View
              style={[
                styles.circleProgress,
                { transform: [{ rotate: arcRotation }] },
              ]}
            />
            <View style={styles.circleInner}>
              <Text style={styles.percentValue}>{displayProgress}%</Text>
              <Text style={styles.percentLabel}>COMPLETE</Text>
            </View>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>STATUS</Text>
            <Text style={styles.metaValue}>{batch.status.replace('_', ' ')}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>STYLE</Text>
            <Text style={styles.metaValue}>{visualStyleLabel}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>PROGRESS</Text>
            <Text style={styles.metaValue}>{completed}/{total}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>FAILED</Text>
            <Text style={styles.metaValue}>{batch.progress.failed ?? 0}</Text>
          </View>
        </View>

        <PrimaryButton label="View Drafts" onPress={() => navigation.navigate('ReviewBatch', { batchId })} />
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Back</Text>
        </TouchableOpacity>

        {/* AI Reasoning Log */}
        <View style={styles.logCard}>
          <View style={styles.logHeader}>
            <View style={styles.logTitleRow}>
              <MaterialIcons name="terminal" size={14} color={Colors.secondary} />
              <Text style={styles.logTitle}>AI REASONING LOG</Text>
            </View>
            <View style={styles.liveDot} />
          </View>
          {reasoningLog.map((line, i) => (
            <Text key={i} style={[styles.logLine, line.type === 'cmd' ? styles.logLineCmd : styles.logLineSystem]}>
              {line.text}
            </Text>
          ))}
        </View>

        {/* Live Preview Stream */}
        <View style={styles.previewSection}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>LIVE PREVIEW STREAM</Text>
            <Text style={styles.previewCount}>{completed}/{total}</Text>
          </View>
          <View style={styles.previewGrid}>
            {ads.slice(0, 6).map((ad) => {
              const hasAsset = !!ad.assetPath && ad.status !== 'generating';
              return (
                <View key={ad.id} style={[styles.previewTile, hasAsset && styles.previewTileReady]}>
                  {hasAsset ? (
                    <AdImage adId={ad.id} hasAsset style={styles.previewImage} fallbackIconSize={20} />
                  ) : (
                    <MaterialIcons name="hourglass-empty" size={20} color={Colors.outlineVariant + '66'} />
                  )}
                </View>
              );
            })}
            {Array.from({ length: Math.max(0, 6 - ads.length) }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.previewTile}>
                <MaterialIcons name="hourglass-empty" size={20} color={Colors.outlineVariant + '66'} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.gutter, gap: Spacing.md, paddingBottom: 40 },

  batchBadge: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryFixed,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
  },
  batchBadgeText: { ...Typography.labelCaps, color: Colors.primary, textTransform: 'uppercase' },

  title: { ...Typography.headlineMd, color: Colors.onSurface, textAlign: 'center' },
  subtitle: { ...Typography.bodyBase, color: Colors.onSurfaceVariant, textAlign: 'center', marginTop: -Spacing.sm },

  circleContainer: { alignItems: 'center', paddingVertical: Spacing.md },
  circleTrack: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 12,
    borderColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circleProgress: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 12,
    borderColor: 'transparent',
    borderTopColor: Colors.primary,
    borderRightColor: Colors.primary,
  },
  circleInner: { alignItems: 'center' },
  percentValue: { ...Typography.displayLg, color: Colors.primary },
  percentLabel: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, textTransform: 'uppercase' },

  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
    backgroundColor: Colors.outlineVariant + '33',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
    overflow: 'hidden',
  },
  metaItem: {
    width: '50%',
    padding: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  metaLabel: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, textTransform: 'uppercase', marginBottom: 4 },
  metaValue: { ...Typography.titleMd, color: Colors.onSurface, textTransform: 'capitalize' },

  cancelBtn: {
    paddingVertical: 14,
    borderRadius: Radius.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
  },
  cancelText: { ...Typography.titleMd, color: Colors.onSurface },

  logCard: {
    backgroundColor: Colors.inverseSurface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 6,
  },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  logTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logTitle: { ...Typography.labelCaps, color: Colors.secondary, textTransform: 'uppercase' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  logLine: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 12, lineHeight: 18 },
  logLineSystem: { color: Colors.secondary },
  logLineCmd: { color: Colors.inverseOnSurface + 'CC' },

  previewSection: { gap: Spacing.sm },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewTitle: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, textTransform: 'uppercase' },
  previewCount: { ...Typography.labelCaps, color: Colors.primary, fontWeight: '700' },
  previewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  previewTile: {
    width: '30.5%',
    aspectRatio: 1,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
    overflow: 'hidden',
  },
  previewTileReady: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderColor: Colors.outlineVariant,
  },
  previewImage: { width: '100%', height: '100%' },
});
