import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import { RootStackParamList } from '../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const insights = [
  { icon: 'schedule', label: 'Best posting time', value: '7–10 PM', trend: '+2.4× CTR', positive: true },
  { icon: 'people', label: 'Top audience segment', value: 'The Trendsetter', trend: '3.1× ROAS', positive: true },
  { icon: 'palette', label: 'Best visual style', value: 'Bold & Energetic', trend: '+18% engagement', positive: true },
  { icon: 'campaign', label: 'Worst-performing goal', value: 'Brand Awareness', trend: '-0.8× ROAS', positive: false },
];

export default function LearnScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Performance Intelligence</Text>
        <Text style={styles.subtitle}>AI-analyzed patterns from your approved ads and campaigns.</Text>

        <TouchableOpacity style={styles.playbookCard} onPress={() => navigation.navigate('BrandPlaybook')}>
          <LinearGradient colors={[Colors.primary, Colors.secondary]} style={styles.playbookGradient}>
            <MaterialIcons name="menu-book" size={28} color={Colors.onPrimary} />
            <View style={styles.playbookText}>
              <Text style={styles.playbookTitle}>Brand Intelligence Playbook</Text>
              <Text style={styles.playbookDesc}>Your evolving guide to what works</Text>
            </View>
            <MaterialIcons name="arrow-forward" size={20} color={Colors.onPrimary} />
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Key Learnings</Text>
        {insights.map((item) => (
          <View key={item.label} style={styles.insightCard}>
            <View style={styles.insightIcon}>
              <MaterialIcons name={item.icon as any} size={20} color={Colors.primary} />
            </View>
            <View style={styles.insightText}>
              <Text style={styles.insightLabel}>{item.label}</Text>
              <Text style={styles.insightValue}>{item.value}</Text>
            </View>
            <View style={[styles.trendBadge, { backgroundColor: item.positive ? Colors.success + '1A' : Colors.error + '1A' }]}>
              <Text style={[styles.trendText, { color: item.positive ? Colors.success : Colors.error }]}>{item.trend}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.campaignBtn} onPress={() => navigation.navigate('CampaignInsights', { campaignId: '1' })}>
          <Text style={styles.campaignBtnText}>View Campaign Insights →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.gutter, gap: Spacing.md, paddingBottom: 32 },
  title: { ...Typography.headlineMd, color: Colors.onSurface },
  subtitle: { ...Typography.bodyBase, color: Colors.onSurfaceVariant },
  playbookCard: { borderRadius: Radius.lg, overflow: 'hidden' },
  playbookGradient: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  playbookText: { flex: 1 },
  playbookTitle: { ...Typography.titleMd, color: Colors.onPrimary },
  playbookDesc: { ...Typography.bodySm, color: Colors.onPrimary + 'CC' },
  sectionTitle: { ...Typography.titleMd, color: Colors.onSurface },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
  },
  insightIcon: {
    width: 40, height: 40,
    borderRadius: Radius.DEFAULT,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
  },
  insightText: { flex: 1 },
  insightLabel: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, textTransform: 'uppercase' },
  insightValue: { ...Typography.bodySm, color: Colors.onSurface, fontWeight: '600' },
  trendBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  trendText: { ...Typography.labelCaps, fontSize: 10, fontWeight: '700' },
  campaignBtn: {
    padding: Spacing.md,
    backgroundColor: Colors.primaryFixed,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  campaignBtnText: { ...Typography.titleMd, color: Colors.primary },
});
