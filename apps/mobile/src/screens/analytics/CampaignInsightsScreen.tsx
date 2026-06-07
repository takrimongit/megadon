import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorView from '../../components/ErrorView';
import { RootStackParamList } from '../../navigation';
import { api, CampaignMetricsResponse } from '../../lib/api';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'CampaignInsights'>;

const periods: Array<'7d' | '30d' | '90d'> = ['7d', '30d', '90d'];

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatMetrics(m: CampaignMetricsResponse['metrics']) {
  return [
    { label: 'IMPRESSIONS', value: formatCompact(m.impressions) },
    { label: 'CLICKS', value: formatCompact(m.clicks) },
    { label: 'CTR', value: `${(m.ctr * 100).toFixed(2)}%` },
    { label: 'ROAS', value: `${m.roas.toFixed(1)}×` },
    { label: 'SPEND', value: `$${m.spend.toLocaleString()}` },
    { label: 'CONVERSIONS', value: String(m.conversions) },
  ];
}

export default function CampaignInsightsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { campaignId } = route.params;
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [data, setData] = useState<CampaignMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const resp = await api.campaignMetrics(campaignId, period);
      setData(resp);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, [campaignId, period]);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = data ? formatMetrics(data.metrics) : [];
  const topAds = data?.topAds ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader showBack onBack={() => navigation.goBack()} title="Campaign Insights" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.periodRow}>
          {periods.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodChip, period === p && styles.periodChipActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? (
          <ErrorView message={error} onRetry={load} style={{ minHeight: 160 }} />
        ) : loading || !data ? (
          <LoadingSpinner style={{ minHeight: 160 }} />
        ) : (
          <>
            <View style={styles.metricsGrid}>
              {metrics.map((m) => (
                <View key={m.label} style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{m.label}</Text>
                  <Text style={styles.metricValue}>{m.value}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Top Performing Ads</Text>
          </>
        )}
        {!error && !loading && data && topAds.map((ad, i) => (
          <TouchableOpacity
            key={ad.id}
            style={styles.adRow}
            onPress={() => navigation.navigate('AdIntelligence', { adId: ad.id })}
            activeOpacity={0.8}
          >
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{i + 1}</Text>
            </View>
            <View style={styles.adInfo}>
              <Text style={styles.adHeadline}>{ad.headline}</Text>
              <Text style={styles.adMeta}>ROAS {ad.roas} · CTR {ad.ctr}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.gutter, gap: Spacing.md, paddingBottom: 32 },
  periodRow: { flexDirection: 'row', gap: Spacing.sm },
  periodChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  periodChipActive: { backgroundColor: Colors.primaryFixed, borderColor: Colors.primary },
  periodText: { ...Typography.labelCaps, color: Colors.onSurfaceVariant },
  periodTextActive: { color: Colors.primary, fontWeight: '700' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  metricCard: {
    width: '30%',
    flex: 1,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
    gap: 2,
  },
  metricLabel: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, textTransform: 'uppercase', fontSize: 9 },
  metricValue: { ...Typography.titleMd, color: Colors.onSurface },
  metricDelta: { ...Typography.labelCaps, fontWeight: '700' },
  sectionTitle: { ...Typography.titleMd, color: Colors.onSurface },
  adRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.outlineVariant + '4D',
  },
  rankBadge: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
  },
  rankText: { ...Typography.labelCaps, color: Colors.primary, fontWeight: '700' },
  adInfo: { flex: 1 },
  adHeadline: { ...Typography.bodySm, color: Colors.onSurface, fontWeight: '600' },
  adMeta: { ...Typography.labelCaps, color: Colors.onSurfaceVariant },
});
