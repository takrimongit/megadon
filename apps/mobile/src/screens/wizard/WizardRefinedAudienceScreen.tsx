import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Persona } from '@megadon/types';
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

export default function WizardRefinedAudienceScreen() {
  const navigation = useNavigation<Nav>();
  const { state, update } = useWizard();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await api.suggestPersonas({
        ageGroups: state.ageGroups,
        interests: state.interests,
        personaDescription: state.personaDescription || undefined,
      });
      setPersonas(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate personas');
    } finally {
      setLoading(false);
    }
  }, [state.ageGroups, state.interests, state.personaDescription]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AppHeader showBack onBack={() => navigation.goBack()} />
      <WizardProgress currentStep={3} totalSteps={6} stepLabel="Refined Audience" />
      {loading ? (
        <LoadingSpinner label="Generating personas with AI…" />
      ) : error ? (
        <ErrorView message={error} onRetry={load} />
      ) : (
        <>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.aiBadge}>
              <MaterialIcons name="auto-awesome" size={14} color={Colors.secondary} />
              <Text style={styles.aiBadgeText}>AI-Generated Personas</Text>
            </View>
            <Text style={styles.title}>Select your best-fit persona</Text>
            <Text style={styles.subtitle}>Based on your inputs, AdForge AI identified these high-potential audience segments.</Text>

            {personas.map((p) => {
              const selected = state.selectedPersona?.id === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.card, selected && styles.cardSelected]}
                  onPress={() => update({ selectedPersona: p })}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardName, selected && styles.cardNameSelected]}>{p.name}</Text>
                    <View style={styles.reachBadge}>
                      <Text style={styles.reachText}>{p.reach} reach</Text>
                    </View>
                  </View>
                  <Text style={styles.cardDesc}>{p.desc}</Text>
                  <View style={styles.tagRow}>
                    {p.tags.map((tag) => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={styles.footer}>
            <PrimaryButton
              label="Continue"
              onPress={() => navigation.navigate('WizardOfferPlatforms')}
              disabled={!state.selectedPersona}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: Spacing.gutter, gap: Spacing.md },
  aiBadge: {
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
  aiBadgeText: { ...Typography.labelCaps, color: Colors.secondary },
  title: { ...Typography.headlineMd, color: Colors.onSurface },
  subtitle: { ...Typography.bodyBase, color: Colors.onSurfaceVariant },
  card: {
    padding: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant + '66',
    gap: Spacing.sm,
  },
  cardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryFixed },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardName: { ...Typography.titleMd, color: Colors.onSurface },
  cardNameSelected: { color: Colors.primary },
  reachBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.success + '1A',
  },
  reachText: { ...Typography.labelCaps, color: Colors.success, fontSize: 10 },
  cardDesc: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
  },
  tagText: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, fontSize: 10 },
  footer: { padding: Spacing.gutter, paddingBottom: Spacing.lg },
});
