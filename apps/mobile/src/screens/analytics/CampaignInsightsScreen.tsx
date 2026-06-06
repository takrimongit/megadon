import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import { RootStackParamList } from '../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const metrics = [
  { label: 'IMPRESSIONS', value: '284K', delta: '+18%', positive: true },
  { label: 'CLICKS', value: '12.4K', delta: '+22%', positive: true },
  { label: 'CTR', value: '4.36%', delta: '+0.8%', positive: true },
  { label: 'ROAS', value: '3.2×', delta: '+0.4×', positive: true },
  { label: 'SPEND', value: '$4,200', delta: '+5%', positive: false },
  { label: 'CONVERSIONS', value: '342', delta: '+31%', positive: true },
];

const topAds = [
  { id: 'ad-1', headline: 'Shop the Summer Drop', roas: '4.8×', ctr: '6.2%' },
  { id: 'ad-2', headline: 'Limited Time: 30% Off', roas: '4.1×', ctr: '5.8%' },
  { id: 'ad-3', headline: "Don't Miss Out", roas: '3.7×', ctr: '5.1%' },
];

const periods = ['7d', '30d', '90d'];

export default function CampaignInsightsScreen() {
  const navigation = useNavigation<Nav>();
  const [period, setPeriod] = useState('30d');

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

        <View style={styles.metricsGrid}>
          {metrics.map((m) => (
            <View key={m.label} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{m.label}</Text>
              <Text style={styles.metricValue}>{m.value}</Text>
              <Text style={[styles.metricDelta, { color: m.positive ? Colors.success : Colors.error }]}>{m.delta}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Top Performing Ads</Text>
        {topAds.map((ad, i) => (
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
