import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Brief } from '@megadon/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import WizardProgress from '../../components/WizardProgress';
import PrimaryButton from '../../components/PrimaryButton';
import { RootStackParamList } from '../../navigation';
import { useWizard } from '../../lib/WizardContext';
import { api } from '../../lib/api';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function summarizeGoal(goal: string | null, options: ReturnType<typeof useWizard>['state']['options']): string {
  if (!goal) return '—';
  return options?.goals.find((g) => g.id === goal)?.label ?? goal;
}

export default function WizardFinalReviewScreen() {
  const navigation = useNavigation<Nav>();
  const { state } = useWizard();
  const [submitting, setSubmitting] = useState(false);

  const summary = useMemo(() => {
    const goalLabel = summarizeGoal(state.goal, state.options);
    const audienceLabel = state.selectedPersona
      ? `${state.selectedPersona.name} · ${state.ageGroups.join(', ') || '—'}`
      : state.ageGroups.join(', ') || '—';
    const platformLabel = state.platforms
      .map((p) => state.options?.platforms.find((opt) => opt.id === p)?.label ?? p)
      .join(', ') || '—';
    const styleLabel = state.options?.visualStyles.find((s) => s.id === state.creativeStyle)?.label ?? '—';
    return [
      { label: 'Campaign Goal', value: goalLabel, icon: 'campaign' },
      { label: 'Audience', value: audienceLabel, icon: 'people' },
      { label: 'Offer', value: state.offer || '—', icon: 'local-offer' },
      { label: 'Platforms', value: platformLabel, icon: 'devices' },
      { label: 'Creative Style', value: styleLabel, icon: 'palette' },
      { label: 'Batch Size', value: `${state.batchSize} ads`, icon: 'layers' },
    ];
  }, [state]);

  const handleGenerate = async () => {
    if (!state.goal || !state.creativeStyle || state.platforms.length === 0 || state.offer.length < 5) {
      Alert.alert('Incomplete brief', 'Please finish filling out every step before generating.');
      return;
    }

    setSubmitting(true);
    try {
      const brief: Brief = {
        goal: state.goal,
        audience: {
          ageGroups: state.ageGroups,
          interests: state.interests,
          personaDescription: state.personaDescription || undefined,
          selectedPersona: state.selectedPersona ?? undefined,
        },
        offer: state.offer,
        platforms: state.platforms,
        batchSize: state.batchSize,
        creativeStyle: state.creativeStyle,
        tones: state.tones,
        mediaType: state.mediaType,
        videoStyle: state.videoStyle,
      };
      const name = `${summarizeGoal(state.goal, state.options)} — ${new Date().toLocaleDateString()}`;
      const { batchId } = await api.createBatch({ name, brief });
      navigation.replace('GeneratingBatch', { batchId });
    } catch (e) {
      Alert.alert('Generation failed', e instanceof Error ? e.message : 'Could not create the batch.');
    } finally {
      setSubmitting(false);
    }
  };

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
        <Text style={styles.subtitle}>AdForge AI will use this brief to generate your batch.</Text>

        <View style={styles.summaryCard}>
          {summary.map((item, i) => (
            <View key={item.label}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryIcon}>
                  <MaterialIcons name={item.icon as keyof typeof MaterialIcons.glyphMap} size={18} color={Colors.primary} />
                </View>
                <View style={styles.summaryText}>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                  <Text style={styles.summaryValue} numberOfLines={2}>{item.value}</Text>
                </View>
                <TouchableOpacity style={styles.editBtn} onPress={() => navigation.goBack()}>
                  <MaterialIcons name="edit" size={16} color={Colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
              {i < summary.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        <View style={styles.estimateCard}>
          <MaterialIcons name="schedule" size={18} color={Colors.primary} />
          <Text style={styles.estimateText}>
            Estimated generation time: <Text style={styles.estimateBold}>~{Math.max(1, Math.round(state.batchSize * 8 / 60))}–{Math.max(2, Math.round(state.batchSize * 12 / 60))} min</Text>
          </Text>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton label="Generate Batch" onPress={handleGenerate} loading={submitting} disabled={submitting} />
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
