import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { VisualStyle } from '@megadon/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import WizardProgress from '../../components/WizardProgress';
import PrimaryButton from '../../components/PrimaryButton';
import { RootStackParamList } from '../../navigation';
import { useWizard } from '../../lib/WizardContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const styleGradients: Record<VisualStyle, readonly [string, string]> = {
  bold: ['#3525cd', '#831ada'],
  minimal: ['#374151', '#6b7280'],
  warm: ['#d97706', '#b45309'],
  playful: ['#16a34a', '#059669'],
};

export default function WizardCreativeStyleScreen() {
  const navigation = useNavigation<Nav>();
  const { state, update } = useWizard();

  const visualStyles = state.options?.visualStyles ?? [];
  const tones = state.options?.tones ?? [];

  const toggleTone = (t: string) => {
    const next = state.tones.includes(t)
      ? state.tones.filter((x) => x !== t)
      : [...state.tones, t];
    update({ tones: next });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AppHeader showBack onBack={() => navigation.goBack()} />
      <WizardProgress currentStep={5} totalSteps={6} stepLabel="Creative Style" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Define your creative style</Text>
        <Text style={styles.subtitle}>This guides the visual language and tone AI uses to generate your ads.</Text>

        <Text style={styles.fieldLabel}>VISUAL STYLE</Text>
        <View style={styles.styleGrid}>
          {visualStyles.map((s) => {
            const selected = state.creativeStyle === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.styleCard, selected && styles.styleCardSelected]}
                onPress={() => update({ creativeStyle: s.id })}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={styleGradients[s.id] ?? [Colors.primary, Colors.secondary]}
                  style={styles.stylePreview}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <Text style={[styles.styleName, selected && styles.styleNameSelected]}>{s.label}</Text>
                <Text style={styles.styleDesc}>{s.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>TONE OF VOICE</Text>
        <View style={styles.toneRow}>
          {tones.map((t) => {
            const selected = state.tones.includes(t);
            return (
              <TouchableOpacity
                key={t}
                style={[styles.toneChip, selected && styles.toneChipSelected]}
                onPress={() => toggleTone(t)}
                activeOpacity={0.8}
              >
                <Text style={[styles.toneText, selected && styles.toneTextSelected]}>{t}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton
          label="Review & Launch"
          onPress={() => navigation.navigate('WizardFinalReview')}
          disabled={!state.creativeStyle}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: Spacing.gutter, gap: Spacing.md },
  title: { ...Typography.headlineMd, color: Colors.onSurface },
  subtitle: { ...Typography.bodyBase, color: Colors.onSurfaceVariant },
  fieldLabel: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, textTransform: 'uppercase' },
  styleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  styleCard: {
    width: '47%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant + '66',
    overflow: 'hidden',
    padding: Spacing.sm,
    gap: 6,
  },
  styleCardSelected: { borderColor: Colors.primary },
  stylePreview: { height: 60, borderRadius: Radius.DEFAULT },
  styleName: { ...Typography.bodySm, color: Colors.onSurface, fontWeight: '600' },
  styleNameSelected: { color: Colors.primary },
  styleDesc: { ...Typography.labelCaps, color: Colors.onSurfaceVariant },
  toneRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  toneChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  toneChipSelected: { backgroundColor: Colors.primaryFixed, borderColor: Colors.primary },
  toneText: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  toneTextSelected: { color: Colors.primary, fontWeight: '600' },
  footer: { padding: Spacing.gutter, paddingBottom: Spacing.lg },
});
