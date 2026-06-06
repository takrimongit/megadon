import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import type { Batch } from '@megadon/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorView from '../../components/ErrorView';
import { RootStackParamList } from '../../navigation';
import { getDb } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function ageDays(iso?: string): number {
  if (!iso) return 0;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function priorityFor(batch: Batch): { label: 'High' | 'Medium' | 'Low'; color: string } {
  const days = ageDays(batch.createdAt);
  if (days >= 2) return { label: 'High', color: Colors.error };
  if (days >= 1) return { label: 'Medium', color: Colors.warning };
  return { label: 'Low', color: Colors.success };
}

function relativeAge(iso?: string): string {
  if (!iso) return 'just now';
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function QueueScreen() {
  const navigation = useNavigation<Nav>();
  const { workspaceId } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    const q = query(
      collection(getDb(), `workspaces/${workspaceId}/batches`),
      where('status', '==', 'pending_review'),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Batch);
        list.sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
        setBatches(list);
        setLoading(false);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      },
    );
    return unsub;
  }, [workspaceId]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader />
      {loading ? (
        <LoadingSpinner label="Loading queue…" />
      ) : error ? (
        <ErrorView message={error} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Review Queue</Text>
            <Text style={styles.subtitle}>
              {batches.length === 0 ? 'No batches awaiting review' : `${batches.length} ${batches.length === 1 ? 'batch' : 'batches'} awaiting review`}
            </Text>
          </View>
          {batches.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialIcons name="rule" size={36} color={Colors.outlineVariant} />
              <Text style={styles.emptyText}>You're all caught up.</Text>
            </View>
          ) : (
            batches.map((batch) => {
              const p = priorityFor(batch);
              return (
                <TouchableOpacity
                  key={batch.id}
                  style={styles.queueCard}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('ReviewBatch', { batchId: batch.id })}
                >
                  <View style={styles.queueLeft}>
                    <View style={[styles.priorityDot, { backgroundColor: p.color }]} />
                    <View style={styles.queueText}>
                      <Text style={styles.queueName} numberOfLines={1}>{batch.name}</Text>
                      <Text style={styles.queueMeta}>{batch.progress?.total ?? 0} ads · {relativeAge(batch.createdAt)}</Text>
                    </View>
                  </View>
                  <View style={[styles.priorityBadge, { backgroundColor: p.color + '1A' }]}>
                    <Text style={[styles.priorityText, { color: p.color }]}>{p.label}</Text>
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
  content: { padding: Spacing.gutter, gap: Spacing.sm, paddingBottom: 32 },
  header: { marginBottom: Spacing.sm },
  title: { ...Typography.headlineMd, color: Colors.onSurface },
  subtitle: { ...Typography.bodyBase, color: Colors.onSurfaceVariant },
  queueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
    gap: Spacing.sm,
  },
  queueLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  queueText: { flex: 1 },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
  queueName: { ...Typography.bodySm, color: Colors.onSurface, fontWeight: '600' },
  queueMeta: { ...Typography.labelCaps, color: Colors.onSurfaceVariant },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  priorityText: { ...Typography.labelCaps, fontSize: 10, fontWeight: '700' },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
  },
  emptyText: { ...Typography.bodySm, color: Colors.onSurfaceVariant, textAlign: 'center' },
});
