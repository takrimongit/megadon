import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import WizardProgress from '../../components/WizardProgress';
import PrimaryButton from '../../components/PrimaryButton';
import { RootStackParamList } from '../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const summary = [
  { label: 'Campaign Goal', value: 'Drive Conversions', icon: 'shopping-cart' },
  { label: 'Audience', value: 'The Trendsetter · 25–34', icon: 'people' },
  { label: 'Offer', value: '30% off summer collection', icon: 'local-offer' },
  { label: 'Platforms', value: 'Instagram, TikTok', icon: 'devices' },
  { label: 'Creative Style', value: 'Bold & Energetic', icon: 'palette' },
  { label: 'Batch Size', value: '10 ads', icon: 'layers' },
];

export default function WizardFinalReviewScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AppHeader showBack onBack={() => navigation.goBack()} />
      <WizardProgress currentStep={6} totalSteps={6} stepLabel="Final Review" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.readyBadge}>
          <MaterialIcons name="auto-awesome" size={16} color={Colors.secondary} />
          <Text style={styles.readyText}>Ready to Generate</Text>
        </View>
        <Text style={styles.title}>Review your brief</Text>
        <Text style={styles.subtitle}>AdForge AI will use this brief to generate your batch. You can edit any section below.</Text>

        <View style={styles.summaryCard}>
          {summary.map((item, i) => (
            <View key={item.label}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryIcon}>
                  <MaterialIcons name={item.icon as any} size={18} color={Colors.primary} />
                </View>
                <View style={styles.summaryText}>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                  <Text style={styles.summaryValue}>{item.value}</Text>
                </View>
                <TouchableOpacity style={styles.editBtn}>
                  <MaterialIcons name="edit" size={16} color={Colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
              {i < summary.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        <View style={styles.estimateCard}>
          <MaterialIcons name="schedule" size={18} color={Colors.primary} />
          <Text style={styles.estimateText}>Estimated generation time: <Text style={styles.estimateBold}>~2–3 minutes</Text></Text>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton label="Generate Batch" onPress={() => navigation.navigate('GeneratingBatch')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: Spacing.gutter, gap: Spacing.md },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondary + '1A',
    borderWidth: 1,
    borderColor: Colors.secondary + '33',
  },
  readyText: { ...Typography.labelCaps, color: Colors.secondary },
  title: { ...Typography.headlineMd, color: Colors.onSurface },
  subtitle: { ...Typography.bodyBase, color: Colors.onSurfaceVariant },
  summaryCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.DEFAULT,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: { flex: 1 },
  summaryLabel: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, textTransform: 'uppercase' },
  summaryValue: { ...Typography.bodyBase, color: Colors.onSurface, fontWeight: '600' },
  editBtn: { padding: 6 },
  divider: { height: 1, backgroundColor: Colors.outlineVariant + '33', marginLeft: 68 },
  estimateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.primaryFixed,
    borderRadius: Radius.md,
  },
  estimateText: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  estimateBold: { color: Colors.primary, fontWeight: '700' },
  footer: { padding: Spacing.gutter, paddingBottom: Spacing.lg },
});
