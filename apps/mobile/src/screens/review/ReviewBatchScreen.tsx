import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import type { Ad, AdStatus, Batch } from '@megadon/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import PrimaryButton from '../../components/PrimaryButton';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorView from '../../components/ErrorView';
import AdImage from '../../components/AdImage';
import { RootStackParamList } from '../../navigation';
import { getDb } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { api } from '../../lib/api';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ReviewBatch'>;

const statusColors: Record<AdStatus, string> = {
  generating: Colors.primary,
  pending: Colors.onSurfaceVariant,
  approved: Colors.success,
  rejected: Colors.error,
  failed: Colors.error,
};

const statusLabel: Record<AdStatus, string> = {
  generating: 'Generating',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  failed: 'Failed',
};

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ReviewBatchScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { workspaceId } = useAuth();
  const { batchId } = route.params;
  const [batch, setBatch] = useState<Batch | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDecisions, setPendingDecisions] = useState<Record<string, 'approved' | 'rejected'>>({});
  const [submitting, setSubmitting] = useState(false);

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
      (snap) => {
        setAds(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Ad));
        setLoading(false);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      },
    );
    return () => {
      unsubBatch();
      unsubAds();
    };
  }, [workspaceId, batchId]);

  const effectiveStatus = (ad: Ad): AdStatus => pendingDecisions[ad.id] ?? ad.status;

  const approve = (id: string) => setPendingDecisions((p) => ({ ...p, [id]: 'approved' }));
  const reject = (id: string) => setPendingDecisions((p) => ({ ...p, [id]: 'rejected' }));

  const decisionCount = useMemo(() => Object.keys(pendingDecisions).length, [pendingDecisions]);

  const submitDecisions = async () => {
    const decisions = Object.entries(pendingDecisions).map(([adId, status]) => ({ adId, status }));
    if (decisions.length === 0) {
      navigation.navigate('MainTabs');
      return;
    }
    setSubmitting(true);
    try {
      await api.bulkDecisions(batchId, decisions);
      setPendingDecisions({});
      navigation.navigate('MainTabs');
    } catch (e) {
      Alert.alert('Submit failed', e instanceof Error ? e.message : 'Could not submit decisions.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && ads.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader showBack onBack={() => navigation.goBack()} title={`Batch ${batchId.slice(0, 6)}`} />
        <LoadingSpinner label="Loading ads…" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader showBack onBack={() => navigation.goBack()} />
        <ErrorView message={error} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader showBack onBack={() => navigation.goBack()} title={`Batch ${batchId.slice(0, 6)}`} />
      <View style={styles.batchInfo}>
        <Text style={styles.batchTitle} numberOfLines={1}>{batch?.name ?? 'Batch'}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{ads.length} ads</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{formatDate(batch?.createdAt)}</Text>
          <Text style={styles.metaDot}>·</Text>
          <TouchableOpacity onPress={() => navigation.navigate('RapidReview', { batchId })}>
            <Text style={styles.rapidLink}>Rapid Review →</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={ads}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const status = effectiveStatus(item);
          const hasAsset = !!item.assetPath && item.status !== 'generating';
          return (
            <View style={styles.adCard}>
              <TouchableOpacity
                style={styles.adPreview}
                onPress={() => navigation.navigate('AIRevision', { adId: item.id, batchId })}
                activeOpacity={0.85}
              >
                <AdImage
                  adId={item.id}
                  hasAsset={hasAsset}
                  style={styles.adPlaceholder}
                  fallbackIconSize={32}
                />
                <View style={styles.adOverlay} pointerEvents="none">
                  <Text style={styles.adHeadline} numberOfLines={2}>{item.headline ?? '—'}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusColors[status] + '22' }]}>
                  <Text style={[styles.statusPillText, { color: statusColors[status] }]}>{statusLabel[status]}</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.adMeta}>
                <Text style={styles.adPlatform} numberOfLines={1}>{item.platform} · {item.format}</Text>
                <View style={styles.adActions}>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => reject(item.id)} disabled={item.status === 'generating'}>
                    <MaterialIcons name="close" size={16} color={Colors.error} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => approve(item.id)} disabled={item.status === 'generating'}>
                    <MaterialIcons name="check" size={16} color={Colors.success} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <MaterialIcons name="image" size={36} color={Colors.outlineVariant} />
            <Text style={styles.emptyText}>No ads in this batch yet.</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <PrimaryButton
              label={decisionCount > 0 ? `Submit ${decisionCount} Decisions` : 'Done'}
              onPress={submitDecisions}
              loading={submitting}
              disabled={submitting}
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  batchInfo: { paddingHorizontal: Spacing.gutter, paddingVertical: Spacing.sm },
  batchTitle: { ...Typography.titleMd, color: Colors.onSurface },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' },
  metaText: { ...Typography.labelCaps, color: Colors.onSurfaceVariant },
  metaDot: { ...Typography.labelCaps, color: Colors.outlineVariant },
  rapidLink: { ...Typography.labelCaps, color: Colors.primary },
  grid: { padding: Spacing.gutter, paddingBottom: 100 },
  row: { gap: Spacing.sm, marginBottom: Spacing.sm },
  adCard: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
    overflow: 'hidden',
  },
  adPreview: { position: 'relative' },
  adPlaceholder: { height: 160 },
  adOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  adHeadline: { ...Typography.bodySm, color: Colors.onPrimary, fontWeight: '600' },
  statusPill: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusPillText: { ...Typography.labelCaps, fontSize: 9, fontWeight: '700' },
  adMeta: { padding: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  adPlatform: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, flex: 1 },
  adActions: { flexDirection: 'row', gap: 6 },
  rejectBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.error + '1A',
    alignItems: 'center', justifyContent: 'center',
  },
  approveBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.success + '1A',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  emptyText: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  footer: { padding: Spacing.gutter },
});
