import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import StatCard from '../../components/StatCard';
import { RootStackParamList } from '../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const recentBatches = [
  { id: '402', name: 'Summer Sale — Instagram Reels', status: 'Pending Review', ads: 12, date: 'Jun 5' },
  { id: '401', name: 'Brand Awareness — Facebook', status: 'Approved', ads: 8, date: 'Jun 3' },
  { id: '400', name: 'Product Launch — TikTok', status: 'Generating', ads: 15, date: 'Jun 2' },
];

const statusColors: Record<string, string> = {
  'Pending Review': Colors.warning,
  'Approved': Colors.success,
  'Generating': Colors.primary,
};

export default function DashboardScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <AppHeader />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard label="ACTIVE CAMPAIGNS" value="24" delta="+12%" />
            <StatCard label="ADS GENERATED" value="1.2k" delta="+5%" />
          </View>
          <View style={styles.statsRow}>
            <StatCard label="APPROVAL RATE" value="84%" highlight />
            <StatCard label="AVG. ROAS" value="3.2x" delta="+0.4x" />
          </View>
        </View>

        {/* AI Insight Banner */}
        <TouchableOpacity activeOpacity={0.85} style={styles.insightCard}>
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
              <Text style={styles.insightActionText}>Apply to next batch</Text>
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
            <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Batches' } as any)}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          {recentBatches.map((batch) => (
            <TouchableOpacity
              key={batch.id}
              style={styles.batchCard}
              activeOpacity={0.75}
              onPress={() =>
              batch.status === 'Generating'
                ? navigation.navigate('BatchGenerating', { batchId: batch.id })
                : navigation.navigate('ReviewBatch', { batchId: batch.id })
            }
            >
              <View style={styles.batchIcon}>
                <MaterialIcons name="layers" size={20} color={Colors.primary} />
              </View>
              <View style={styles.batchInfo}>
                <Text style={styles.batchName}>{batch.name}</Text>
                <Text style={styles.batchMeta}>{batch.ads} ads · {batch.date}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColors[batch.status] + '1A' }]}>
                <Text style={[styles.statusText, { color: statusColors[batch.status] }]}>{batch.status}</Text>
              </View>
            </TouchableOpacity>
          ))}
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
});
