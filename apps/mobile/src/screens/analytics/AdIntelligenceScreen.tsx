import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import PrimaryButton from '../../components/PrimaryButton';

const breakdowns = [
  { label: 'Age 25–34', share: 42 },
  { label: 'Age 18–24', share: 28 },
  { label: 'Age 35–44', share: 18 },
  { label: 'Other', share: 12 },
];

const aiNotes = [
  'Urgency language ("Limited Time") drove a 1.8× higher CTR than non-urgent variants',
  'The summer color palette resonated strongly with the 25–34 segment',
  'Short-form video (≤15s) outperformed static images by 2.3×',
];

export default function AdIntelligenceScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader showBack onBack={() => navigation.goBack()} title="Ad Intelligence" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.adCard}>
          <View style={styles.adPlaceholder}>
            <MaterialIcons name="image" size={36} color={Colors.outlineVariant} />
          </View>
          <Text style={styles.adHeadline}>Limited Time: 30% Off</Text>
          <Text style={styles.adBody}>Shop our summer collection with exclusive discounts.</Text>
        </View>

        <View style={styles.metricsRow}>
          {[
            { label: 'ROAS', value: '4.1×' },
            { label: 'CTR', value: '5.8%' },
            { label: 'IMPRESSIONS', value: '48K' },
            { label: 'CONVERSIONS', value: '87' },
          ].map((m) => (
            <View key={m.label} style={styles.metricBox}>
              <Text style={styles.metricLabel}>{m.label}</Text>
              <Text style={styles.metricValue}>{m.value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Audience Breakdown</Text>
        <View style={styles.breakdownCard}>
          {breakdowns.map((b) => (
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
          {aiNotes.map((note, i) => (
            <View key={i} style={styles.noteRow}>
              <View style={styles.noteDot} />
              <Text style={styles.noteText}>{note}</Text>
            </View>
          ))}
        </View>

        <PrimaryButton label="Use Learnings in Next Batch" onPress={() => navigation.navigate('WizardGoal' as never)} />
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
