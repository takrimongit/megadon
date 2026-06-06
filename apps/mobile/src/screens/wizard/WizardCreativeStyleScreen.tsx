import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import WizardProgress from '../../components/WizardProgress';
import PrimaryButton from '../../components/PrimaryButton';
import { RootStackParamList } from '../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const styles_data = [
  { id: 'bold', label: 'Bold & Energetic', desc: 'High contrast, dynamic motion', gradient: ['#3525cd', '#831ada'] as const },
  { id: 'minimal', label: 'Minimal & Clean', desc: 'Whitespace-first, elegant typography', gradient: ['#374151', '#6b7280'] as const },
  { id: 'warm', label: 'Warm & Authentic', desc: 'Natural tones, lifestyle imagery', gradient: ['#d97706', '#b45309'] as const },
  { id: 'playful', label: 'Playful & Fun', desc: 'Bright colors, quirky elements', gradient: ['#16a34a', '#059669'] as const },
];

const tones = ['Professional', 'Casual', 'Urgent', 'Inspiring', 'Humorous', 'Trustworthy'];

export default function WizardCreativeStyleScreen() {
  const navigation = useNavigation<Nav>();
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedTones, setSelectedTones] = useState<string[]>([]);

  const toggleTone = (t: string) =>
    setSelectedTones((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AppHeader showBack onBack={() => navigation.goBack()} />
      <WizardProgress currentStep={5} totalSteps={6} stepLabel="Creative Style" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Define your creative style</Text>
        <Text style={styles.subtitle}>This guides the visual language and tone AI uses to generate your ads.</Text>

        <Text style={styles.fieldLabel}>VISUAL STYLE</Text>
        <View style={styles.styleGrid}>
          {styles_data.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.styleCard, selectedStyle === s.id && styles.styleCardSelected]}
              onPress={() => setSelectedStyle(s.id)}
              activeOpacity={0.85}
            >
              <LinearGradient colors={s.gradient} style={styles.stylePreview} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <Text style={[styles.styleName, selectedStyle === s.id && styles.styleNameSelected]}>{s.label}</Text>
              <Text style={styles.styleDesc}>{s.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>TONE OF VOICE</Text>
        <View style={styles.toneRow}>
          {tones.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.toneChip, selectedTones.includes(t) && styles.toneChipSelected]}
              onPress={() => toggleTone(t)}
              activeOpacity={0.8}
            >
              <Text style={[styles.toneText, selectedTones.includes(t) && styles.toneTextSelected]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton label="Review & Launch" onPress={() => navigation.navigate('WizardFinalReview')} disabled={!selectedStyle} />
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
