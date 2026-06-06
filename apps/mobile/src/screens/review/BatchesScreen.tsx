import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import type { Batch, BatchStatus } from '@megadon/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorView from '../../components/ErrorView';
import { RootStackParamList } from '../../navigation';
import { getDb } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const statusLabels: Record<BatchStatus, { label: string; color: string }> = {
  queued: { label: 'Queued', color: Colors.primary },
  generating: { label: 'Generating', color: Colors.primary },
  pending_review: { label: 'Pending Review', color: Colors.warning },
  approved: { label: 'Approved', color: Colors.success },
  archived: { label: 'Archived', color: Colors.onSurfaceVariant },
  failed: { label: 'Failed', color: Colors.error },
};

const filters: { id: 'all' | BatchStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending_review', label: 'Pending Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'generating', label: 'Generating' },
];

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function BatchesScreen() {
  const navigation = useNavigation<Nav>();
  const { workspaceId } = useAuth();
  const [filter, setFilter] = useState<'all' | BatchStatus>('all');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    const q = query(
      collection(getDb(), `workspaces/${workspaceId}/batches`),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setBatches(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Batch));
        setLoading(false);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      },
    );
    return unsub;
  }, [workspaceId]);

  const filtered = filter === 'all' ? batches : batches.filter((b) => b.status === filter);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader rightIcon="add" onRightPress={() => navigation.navigate('WizardGoal')} />
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
            onPress={() => setFilter(f.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <LoadingSpinner label="Loading batches…" />
      ) : error ? (
        <ErrorView message={error} />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialIcons name="layers" size={36} color={Colors.outlineVariant} />
              <Text style={styles.emptyTitle}>No batches yet</Text>
              <Text style={styles.emptyText}>Tap the + button to generate your first batch.</Text>
            </View>
          ) : (
            filtered.map((batch) => {
              const sl = statusLabels[batch.status];
              const platformLabel = batch.brief?.platforms?.join(', ') ?? '—';
              return (
                <TouchableOpacity
                  key={batch.id}
                  style={styles.batchCard}
                  activeOpacity={0.75}
                  onPress={() =>
                    batch.status === 'generating' || batch.status === 'queued'
                      ? navigation.navigate('BatchGenerating', { batchId: batch.id })
                      : navigation.navigate('ReviewBatch', { batchId: batch.id })
                  }
                >
                  <View style={styles.batchTop}>
                    <View style={[styles.statusDot, { backgroundColor: sl.color }]} />
                    <Text style={styles.batchName} numberOfLines={1}>{batch.name}</Text>
                    <MaterialIcons name="chevron-right" size={20} color={Colors.onSurfaceVariant} />
                  </View>
                  <View style={styles.batchMeta}>
                    <View style={styles.metaItem}>
                      <MaterialIcons name="layers" size={14} color={Colors.onSurfaceVariant} />
                      <Text style={styles.metaText}>{batch.progress?.total ?? 0} ads</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <MaterialIcons name="devices" size={14} color={Colors.onSurfaceVariant} />
                      <Text style={styles.metaText} numberOfLines={1}>{platformLabel}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <MaterialIcons name="calendar-today" size={14} color={Colors.onSurfaceVariant} />
                      <Text style={styles.metaText}>{formatDate(batch.createdAt)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: sl.color + '1A' }]}>
                      <Text style={[styles.statusText, { color: sl.color }]}>{sl.label}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  filterChipActive: { backgroundColor: Colors.primaryFixed, borderColor: Colors.primary },
  filterText: { ...Typography.labelCaps, color: Colors.onSurfaceVariant },
  filterTextActive: { color: Colors.primary, fontWeight: '700' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.gutter, paddingBottom: 32, gap: Spacing.sm },
  batchCard: {
    padding: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
    gap: Spacing.sm,
  },
  batchTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  batchName: { ...Typography.bodySm, color: Colors.onSurface, fontWeight: '600', flex: 1 },
  batchMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...Typography.labelCaps, color: Colors.onSurfaceVariant },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, marginLeft: 'auto' },
  statusText: { ...Typography.labelCaps, fontSize: 10, fontWeight: '700' },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
  },
  emptyTitle: { ...Typography.titleMd, color: Colors.onSurface },
  emptyText: { ...Typography.bodySm, color: Colors.onSurfaceVariant, textAlign: 'center' },
});
