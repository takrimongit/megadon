import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';

const rules = [
  { icon: 'schedule', title: 'Optimal Post Time', value: '7–10 PM weekdays', confidence: 94 },
  { icon: 'people', title: 'Primary Audience', value: 'Trendsetters, 25–34', confidence: 88 },
  { icon: 'palette', title: 'Winning Visual Style', value: 'Bold & Energetic', confidence: 82 },
  { icon: 'text-fields', title: 'Best Copy Length', value: '<15 words headline', confidence: 79 },
  { icon: 'play-circle', title: 'Top Format', value: 'Short-form Video ≤15s', confidence: 91 },
  { icon: 'local-offer', title: 'CTA Style', value: 'Urgency + scarcity', confidence: 86 },
];

export default function BrandPlaybookScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader showBack onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[Colors.primary, Colors.secondary]} style={styles.hero}>
          <MaterialIcons name="menu-book" size={36} color={Colors.onPrimary} />
          <Text style={styles.heroTitle}>Brand Intelligence Playbook</Text>
          <Text style={styles.heroSubtitle}>Learned from 24 campaigns · 1,200+ ads · Updated Jun 5</Text>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Established Brand Rules</Text>
        <Text style={styles.sectionSubtitle}>Confidence scores based on ad performance data.</Text>

        {rules.map((rule) => (
          <View key={rule.title} style={styles.ruleCard}>
            <View style={styles.ruleIcon}>
              <MaterialIcons name={rule.icon as any} size={20} color={Colors.primary} />
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
