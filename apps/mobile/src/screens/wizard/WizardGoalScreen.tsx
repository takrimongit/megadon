import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CampaignGoal } from '@megadon/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import WizardProgress from '../../components/WizardProgress';
import PrimaryButton from '../../components/PrimaryButton';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorView from '../../components/ErrorView';
import { RootStackParamList } from '../../navigation';
import { api } from '../../lib/api';
import { useWizard } from '../../lib/WizardContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function WizardGoalScreen() {
  const navigation = useNavigation<Nav>();
  const { state, update, reset } = useWizard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const options = await api.wizardOptions();
      update({ options });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load wizard options');
    } finally {
      setLoading(false);
    }
  }, [update]);

  // Reset the wizard whenever the user opens it fresh, then fetch options.
  useEffect(() => {
    reset();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (goal: CampaignGoal) => update({ goal });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AppHeader showBack onBack={() => navigation.goBack()} />
      <WizardProgress currentStep={1} totalSteps={6} stepLabel="Campaign Goal" />
      {loading ? (
        <LoadingSpinner label="Loading options…" />
      ) : error ? (
        <ErrorView message={error} onRetry={load} />
      ) : (
        <>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>What's your campaign goal?</Text>
            <Text style={styles.subtitle}>AdForge AI will tailor creative strategies to your objective.</Text>
            {(state.options?.goals ?? []).map((goal) => {
              const selected = state.goal === goal.id;
              return (
                <TouchableOpacity
                  key={goal.id}
                  style={[styles.optionCard, selected && styles.optionCardSelected]}
                  onPress={() => handleSelect(goal.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
                    <MaterialIcons name={goal.icon as keyof typeof MaterialIcons.glyphMap} size={22} color={selected ? Colors.onPrimary : Colors.primary} />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{goal.label}</Text>
                    <Text style={styles.optionDesc}>{goal.desc}</Text>
                  </View>
                  {selected && (
                    <MaterialIcons name="check-circle" size={22} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={styles.footer}>
            <PrimaryButton label="Continue" onPress={() => navigation.navigate('WizardAudience')} disabled={!state.goal} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: Spacing.gutter, gap: Spacing.sm },
  title: { ...Typography.headlineMd, color: Colors.onSurface, marginBottom: 4 },
  subtitle: { ...Typography.bodyBase, color: Colors.onSurfaceVariant, marginBottom: Spacing.sm },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant + '66',
  },
  optionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFixed,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.DEFAULT,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconSelected: { backgroundColor: Colors.primary },
  optionText: { flex: 1 },
  optionLabel: { ...Typography.titleMd, color: Colors.onSurface },
  optionLabelSelected: { color: Colors.primary },
  optionDesc: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  footer: { padding: Spacing.gutter, paddingBottom: Spacing.lg },
});
