import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import type { Ad, AdStatus, Batch, MetaSettings, PublishPlatform, PublishStatus } from '@megadon/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import PrimaryButton from '../../components/PrimaryButton';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorView from '../../components/ErrorView';
import AdMedia from '../../components/AdMedia';
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

const publishBadge: Partial<Record<PublishStatus, { label: string; color: string }>> = {
  publishing: { label: 'Publishing', color: Colors.primary },
  published: { label: 'Published', color: Colors.success },
  partial: { label: 'Partial', color: '#B7791F' },
  failed: { label: 'Publish failed', color: Colors.error },
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
  const [meta, setMeta] = useState<MetaSettings | null>(null);
  const [publishingBatch, setPublishingBatch] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const m = await api.getMetaSettings();
        if (!cancelled) setMeta(m);
      } catch {
        // Publish button simply won't appear if settings can't load.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const approve = (id: string) => setPendingDecisions((p) => ({ ...p, [id]: 'approved' }));
  const reject = (id: string) => setPendingDecisions((p) => ({ ...p, [id]: 'rejected' }));

  const decisionCount = useMemo(() => Object.keys(pendingDecisions).length, [pendingDecisions]);

  const publishTargets = useMemo<PublishPlatform[]>(() => {
    if (!meta?.connected) return [];
    const t: PublishPlatform[] = [];
    if (meta.facebookPageId) t.push('facebook');
    if (meta.instagramUserId) t.push('instagram');
    return t;
  }, [meta]);

  // Server-approved ads with an asset that aren't already published.
  const publishableAds = useMemo(
    () =>
      ads.filter(
        (a) =>
          a.status === 'approved' &&
          !!a.assetPath &&
          (!a.publish || a.publish.status === 'not_published' || a.publish.status === 'failed' || a.publish.status === 'partial'),
      ),
    [ads],
  );

  const publishBatch = async () => {
    if (publishTargets.length === 0 || publishableAds.length === 0) return;
    setPublishingBatch(true);
    let failed = 0;
    for (const ad of publishableAds) {
      try {
        await api.publishAd(ad.id, publishTargets);
      } catch {
        failed += 1;
      }
    }
    setPublishingBatch(false);
    const sent = publishableAds.length - failed;
    Alert.alert(
      'Publishing started',
      failed === 0
        ? `${sent} ad${sent === 1 ? '' : 's'} are publishing to ${publishTargets.join(' & ')}. Track status on each ad.`
        : `${sent} started, ${failed} could not be queued. Try again from the ad detail.`,
    );
  };

  const confirmPublishBatch = () => {
    Alert.alert(
      'Publish approved ads',
      `Publish ${publishableAds.length} approved ad${publishableAds.length === 1 ? '' : 's'} to ${publishTargets.join(' & ')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Publish', style: 'default', onPress: publishBatch },
      ],
    );
  };

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
                <AdMedia
                  adId={item.id}
                  mediaType={item.mediaType}
                  hasAsset={hasAsset}
                  assetVersion={item.assetPath}
                  style={styles.adPlaceholder}
                  fallbackIconSize={32}
                />
                <View style={[styles.statusPill, { backgroundColor: statusColors[status] + '22' }]}>
                  <Text style={[styles.statusPillText, { color: statusColors[status] }]}>{statusLabel[status]}</Text>
                </View>
                {item.publish && publishBadge[item.publish.status] ? (
                  <View style={[styles.publishBadge, { backgroundColor: publishBadge[item.publish.status]!.color }]}>
                    <MaterialIcons name="send" size={9} color={Colors.onPrimary} />
                    <Text style={styles.publishBadgeText}>{publishBadge[item.publish.status]!.label}</Text>
                  </View>
                ) : null}
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
            {publishTargets.length > 0 && publishableAds.length > 0 ? (
              <PrimaryButton
                label={publishingBatch ? 'Publishing…' : `Publish ${publishableAds.length} approved`}
                onPress={confirmPublishBatch}
                loading={publishingBatch}
                disabled={publishingBatch}
              />
            ) : null}
            <PrimaryButton
              label={decisionCount > 0 ? `Submit ${decisionCount} Decisions` : 'Done'}
              onPress={submitDecisions}
              loading={submitting}
              disabled={submitting}
              variant={publishTargets.length > 0 && publishableAds.length > 0 && decisionCount === 0 ? 'ghost' : 'primary'}
              style={publishTargets.length > 0 && publishableAds.length > 0 ? { marginTop: Spacing.sm } : undefined}
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
  publishBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  publishBadgeText: { ...Typography.labelCaps, fontSize: 8, fontWeight: '700', color: Colors.onPrimary },
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
