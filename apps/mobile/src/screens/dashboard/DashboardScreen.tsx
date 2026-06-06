import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import type { Batch, DashboardStats } from '@megadon/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import StatCard from '../../components/StatCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorView from '../../components/ErrorView';
import { RootStackParamList } from '../../navigation';
import { api } from '../../lib/api';
import { getAuthInstance, getDb } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const statusLabels: Record<string, { label: string; color: string }> = {
  generating: { label: 'Generating', color: Colors.primary },
  queued: { label: 'Queued', color: Colors.primary },
  pending_review: { label: 'Pending Review', color: Colors.warning },
  approved: { label: 'Approved', color: Colors.success },
  archived: { label: 'Archived', color: Colors.onSurfaceVariant },
  failed: { label: 'Failed', color: Colors.error },
};

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatPercent(p: number): string {
  return `${Math.round(p * 100)}%`;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { workspaceId } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setStatsError(null);
    setStatsLoading(true);
    try {
      const data = await api.dashboardStats();
      setStats(data);
    } catch (e) {
      setStatsError(e instanceof Error ? e.message : 'Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (!workspaceId) return;
    const q = query(
      collection(getDb(), `workspaces/${workspaceId}/batches`),
      orderBy('createdAt', 'desc'),
      limit(3),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Batch);
        setBatches(items);
        setBatchesLoading(false);
      },
      () => setBatchesLoading(false),
    );
    return unsub;
  }, [workspaceId]);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'You will need to sign back in to access your workspace.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => signOut(getAuthInstance()).catch(() => {}),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <AppHeader onSignOut={handleSignOut} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats grid */}
        {statsError ? (
          <ErrorView message={statsError} onRetry={loadStats} style={{ minHeight: 160 }} />
        ) : statsLoading || !stats ? (
          <LoadingSpinner style={{ minHeight: 160 }} />
        ) : (
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <StatCard label="ACTIVE CAMPAIGNS" value={formatNumber(stats.activeCampaigns)} />
              <StatCard label="ADS GENERATED" value={formatNumber(stats.adsGenerated)} />
            </View>
            <View style={styles.statsRow}>
              <StatCard label="APPROVAL RATE" value={formatPercent(stats.approvalRate)} highlight />
              <StatCard label="AVG. ROAS" value={`${stats.avgRoas.toFixed(1)}x`} />
            </View>
          </View>
        )}

        {/* AI Insight Banner */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.insightCard}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Learn' } as never)}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.insightGradient}
          >
            <View style={styles.insightBadge}>
              <Text style={styles.insightBadgeText}>AI INSIGHT</Text>
            </View>
            <Text style={styles.insightTitle}>Optimize for Evening Engagement</Text>
            <Text style={styles.insightBody}>
              Your top-performing ads get 2.4× more clicks between 7–10 PM. Schedule your next batch for this window.
            </Text>
            <View style={styles.insightAction}>
              <Text style={styles.insightActionText}>See what's working</Text>
              <MaterialIcons name="arrow-forward" size={16} color={Colors.onPrimary} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* New Batch CTA */}
        <TouchableOpacity
          style={styles.newBatchBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('WizardGoal')}
        >
          <MaterialIcons name="add" size={20} color={Colors.primary} />
          <Text style={styles.newBatchText}>Generate New Batch</Text>
          <MaterialIcons name="chevron-right" size={20} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>

        {/* Recent Batches */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Batches</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Batches' } as never)}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          {batchesLoading ? (
            <LoadingSpinner style={{ minHeight: 120 }} />
          ) : batches.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialIcons name="layers" size={28} color={Colors.outlineVariant} />
              <Text style={styles.emptyText}>No batches yet. Generate your first one!</Text>
            </View>
          ) : (
            batches.map((batch) => {
              const sl = statusLabels[batch.status] ?? { label: batch.status, color: Colors.onSurfaceVariant };
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
                  <View style={styles.batchIcon}>
                    <MaterialIcons name="layers" size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.batchInfo}>
                    <Text style={styles.batchName} numberOfLines={1}>{batch.name}</Text>
                    <Text style={styles.batchMeta}>{batch.progress?.total ?? 0} ads · {formatDate(batch.createdAt)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sl.color + '1A' }]}>
                    <Text style={[styles.statusText, { color: sl.color }]}>{sl.label}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.gutter, paddingBottom: 32, gap: Spacing.md },
  statsGrid: { gap: Spacing.sm, marginTop: Spacing.md },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  insightCard: { borderRadius: Radius.lg, overflow: 'hidden' },
  insightGradient: { padding: Spacing.md, gap: Spacing.sm },
  insightBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  insightBadgeText: { ...Typography.labelCaps, color: Colors.onPrimary, textTransform: 'uppercase' },
  insightTitle: { ...Typography.titleMd, color: Colors.onPrimary },
  insightBody: { ...Typography.bodySm, color: Colors.onPrimary + 'CC' },
  insightAction: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  insightActionText: { ...Typography.bodySm, color: Colors.onPrimary, fontWeight: '600' },
  newBatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.primaryFixed,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
  },
  newBatchText: { ...Typography.titleMd, color: Colors.primary, flex: 1 },
  section: { gap: Spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { ...Typography.titleMd, color: Colors.onSurface },
  seeAll: { ...Typography.bodySm, color: Colors.primary },
  batchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
  },
  batchIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.DEFAULT,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchInfo: { flex: 1 },
  batchName: { ...Typography.bodySm, color: Colors.onSurface, fontWeight: '600' },
  batchMeta: { ...Typography.labelCaps, color: Colors.onSurfaceVariant },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  statusText: { ...Typography.labelCaps, fontSize: 10, fontWeight: '700' },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
  },
  emptyText: { ...Typography.bodySm, color: Colors.onSurfaceVariant, textAlign: 'center' },
});
