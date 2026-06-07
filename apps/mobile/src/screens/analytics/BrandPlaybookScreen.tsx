import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorView from '../../components/ErrorView';
import { api, PlaybookResponse } from '../../lib/api';

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function BrandPlaybookScreen() {
  const navigation = useNavigation();
  const [data, setData] = useState<PlaybookResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const resp = await api.playbook();
      setData(resp);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load playbook');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader showBack onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[Colors.primary, Colors.secondary]} style={styles.hero}>
          <MaterialIcons name="menu-book" size={36} color={Colors.onPrimary} />
          <Text style={styles.heroTitle}>Brand Intelligence Playbook</Text>
          {data ? (
            <Text style={styles.heroSubtitle}>
              Learned from {data.campaignCount} campaigns · {data.adCount.toLocaleString()}+ ads · Updated {formatDate(data.lastUpdated)}
            </Text>
          ) : (
            <Text style={styles.heroSubtitle}>Your evolving guide to what works</Text>
          )}
        </LinearGradient>

        <Text style={styles.sectionTitle}>Established Brand Rules</Text>
        <Text style={styles.sectionSubtitle}>Confidence scores based on ad performance data.</Text>

        {error ? (
          <ErrorView message={error} onRetry={load} style={{ minHeight: 200 }} />
        ) : loading || !data ? (
          <LoadingSpinner style={{ minHeight: 200 }} />
        ) : (
          <>
            {data.rules.map((rule) => (
              <View key={rule.title} style={styles.ruleCard}>
                <View style={styles.ruleIcon}>
                  <MaterialIcons name={rule.icon as keyof typeof MaterialIcons.glyphMap} size={20} color={Colors.primary} />
                </View>
                <View style={styles.ruleText}>
                  <Text style={styles.ruleTitle}>{rule.title}</Text>
                  <Text style={styles.ruleValue}>{rule.value}</Text>
                </View>
                <View style={styles.confidenceBlock}>
                  <Text style={styles.confidenceValue}>{rule.confidence}%</Text>
                  <Text style={styles.confidenceLabel}>confidence</Text>
                  <View style={styles.confidenceBar}>
                    <View style={[styles.confidenceFill, { width: `${rule.confidence}%` }]} />
                  </View>
                </View>
              </View>
            ))}

            <View style={styles.updateNote}>
              <MaterialIcons name="autorenew" size={16} color={Colors.primary} />
              <Text style={styles.updateText}>This playbook auto-updates after each batch approval cycle.</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 32, gap: Spacing.md },
  hero: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  heroTitle: { ...Typography.headlineMd, color: Colors.onPrimary, textAlign: 'center' },
  heroSubtitle: { ...Typography.bodySm, color: Colors.onPrimary + 'CC', textAlign: 'center' },
  sectionTitle: { ...Typography.titleMd, color: Colors.onSurface, paddingHorizontal: Spacing.gutter },
  sectionSubtitle: { ...Typography.bodyBase, color: Colors.onSurfaceVariant, paddingHorizontal: Spacing.gutter, marginTop: -Spacing.sm },
  ruleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.gutter,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
  },
  ruleIcon: {
    width: 40, height: 40,
    borderRadius: Radius.DEFAULT,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
  },
  ruleText: { flex: 1 },
  ruleTitle: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, textTransform: 'uppercase' },
  ruleValue: { ...Typography.bodySm, color: Colors.onSurface, fontWeight: '600' },
  confidenceBlock: { alignItems: 'flex-end', gap: 2 },
  confidenceValue: { ...Typography.titleMd, color: Colors.primary },
  confidenceLabel: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, fontSize: 9 },
  confidenceBar: {
    width: 48, height: 4,
    backgroundColor: Colors.outlineVariant + '4D',
    borderRadius: Radius.full, overflow: 'hidden',
  },
  confidenceFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: Radius.full },
  updateNote: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.gutter,
    padding: Spacing.md,
    backgroundColor: Colors.primaryFixed,
    borderRadius: Radius.md,
  },
  updateText: { ...Typography.bodySm, color: Colors.onSurfaceVariant, flex: 1 },
});
