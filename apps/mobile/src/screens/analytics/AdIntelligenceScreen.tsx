import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import PrimaryButton from '../../components/PrimaryButton';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorView from '../../components/ErrorView';
import { RootStackParamList } from '../../navigation';
import { api, AdIntelligenceResponse } from '../../lib/api';

type Route = RouteProp<RootStackParamList, 'AdIntelligence'>;

export default function AdIntelligenceScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { adId } = route.params;
  const [data, setData] = useState<AdIntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const resp = await api.adIntelligence(adId);
      setData(resp);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load intelligence');
    } finally {
      setLoading(false);
    }
  }, [adId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader showBack onBack={() => navigation.goBack()} title="Ad Intelligence" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? (
          <ErrorView message={error} onRetry={load} style={{ minHeight: 300 }} />
        ) : loading || !data ? (
          <LoadingSpinner style={{ minHeight: 300 }} />
        ) : (
          <>
            <View style={styles.adCard}>
              <View style={styles.adPlaceholder}>
                <MaterialIcons name="image" size={36} color={Colors.outlineVariant} />
              </View>
              <Text style={styles.adHeadline}>Ad #{data.adId}</Text>
              <Text style={styles.adBody}>Performance breakdown and learnings.</Text>
            </View>

            <View style={styles.metricsRow}>
              {[
                { label: 'ROAS', value: data.metrics.roas },
                { label: 'CTR', value: data.metrics.ctr },
                { label: 'IMPRESSIONS', value: data.metrics.impressions },
                { label: 'CONVERSIONS', value: String(data.metrics.conversions) },
              ].map((m) => (
                <View key={m.label} style={styles.metricBox}>
                  <Text style={styles.metricLabel}>{m.label}</Text>
                  <Text style={styles.metricValue}>{m.value}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Audience Breakdown</Text>
            <View style={styles.breakdownCard}>
              {data.audienceBreakdown.map((b) => (
                <View key={b.label} style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>{b.label}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${b.share}%` }]} />
                  </View>
                  <Text style={styles.breakdownShare}>{b.share}%</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>AI Analysis</Text>
            <View style={styles.aiCard}>
              <View style={styles.aiBadge}>
                <MaterialIcons name="auto-awesome" size={14} color={Colors.secondary} />
                <Text style={styles.aiBadgeText}>AI Insights</Text>
              </View>
              {data.aiNotes.map((note, i) => (
                <View key={i} style={styles.noteRow}>
                  <View style={styles.noteDot} />
                  <Text style={styles.noteText}>{note}</Text>
                </View>
              ))}
            </View>

            <PrimaryButton label="Use Learnings in Next Batch" onPress={() => navigation.navigate('WizardGoal' as never)} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.gutter, gap: Spacing.md, paddingBottom: 32 },
  adCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
    overflow: 'hidden',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  adPlaceholder: {
    width: '100%', height: 120,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  adHeadline: { ...Typography.titleMd, color: Colors.onSurface, textAlign: 'center' },
  adBody: { ...Typography.bodySm, color: Colors.onSurfaceVariant, textAlign: 'center' },
  metricsRow: { flexDirection: 'row', gap: Spacing.sm },
  metricBox: {
    flex: 1, padding: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.outlineVariant + '4D',
    alignItems: 'center', gap: 2,
  },
  metricLabel: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, fontSize: 9, textTransform: 'uppercase' },
  metricValue: { ...Typography.titleMd, color: Colors.primary },
  sectionTitle: { ...Typography.titleMd, color: Colors.onSurface },
  breakdownCard: {
    padding: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
    gap: Spacing.md,
  },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  breakdownLabel: { ...Typography.bodySm, color: Colors.onSurface, width: 80 },
  barTrack: { flex: 1, height: 8, backgroundColor: Colors.surfaceContainer, borderRadius: Radius.full, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: Radius.full },
  breakdownShare: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, width: 32, textAlign: 'right' },
  aiCard: {
    padding: Spacing.md,
    backgroundColor: Colors.secondary + '0A',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.secondary + '22',
    gap: Spacing.sm,
  },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondary + '1A',
  },
  aiBadgeText: { ...Typography.labelCaps, color: Colors.secondary },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  noteDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.secondary, marginTop: 7 },
  noteText: { ...Typography.bodySm, color: Colors.onSurfaceVariant, flex: 1 },
});
