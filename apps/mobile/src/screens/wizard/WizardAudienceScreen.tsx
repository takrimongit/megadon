import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import WizardProgress from '../../components/WizardProgress';
import PrimaryButton from '../../components/PrimaryButton';
import { RootStackParamList } from '../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ageGroups = ['18–24', '25–34', '35–44', '45–54', '55+'];
const interests = ['Fashion', 'Tech', 'Fitness', 'Travel', 'Food', 'Finance', 'Gaming', 'Parenting'];

export default function WizardAudienceScreen() {
  const navigation = useNavigation<Nav>();
  const [selectedAges, setSelectedAges] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [persona, setPersona] = useState('');

  const toggle = <T,>(arr: T[], item: T, set: (v: T[]) => void) =>
    set(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);

  const isValid = selectedAges.length > 0 || persona.length > 10;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AppHeader showBack onBack={() => navigation.goBack()} />
      <WizardProgress currentStep={2} totalSteps={6} stepLabel="Target Audience" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Who are you targeting?</Text>
        <Text style={styles.subtitle}>Define your ideal audience so AI can craft the right message.</Text>

        <Text style={styles.fieldLabel}>AGE GROUPS</Text>
        <View style={styles.chipRow}>
          {ageGroups.map((age) => (
            <TouchableOpacity
              key={age}
              style={[styles.chip, selectedAges.includes(age) && styles.chipSelected]}
              onPress={() => toggle(selectedAges, age, setSelectedAges)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, selectedAges.includes(age) && styles.chipTextSelected]}>{age}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>INTERESTS</Text>
        <View style={styles.chipRow}>
          {interests.map((interest) => (
            <TouchableOpacity
              key={interest}
              style={[styles.chip, selectedInterests.includes(interest) && styles.chipSelected]}
              onPress={() => toggle(selectedInterests, interest, setSelectedInterests)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, selectedInterests.includes(interest) && styles.chipTextSelected]}>{interest}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>DESCRIBE YOUR IDEAL CUSTOMER (OPTIONAL)</Text>
        <TextInput
          style={styles.textArea}
          value={persona}
          onChangeText={setPersona}
          placeholder="e.g. Urban millennials who care about sustainable fashion and shop online..."
          placeholderTextColor={Colors.onSurfaceVariant + '80'}
          multiline
          numberOfLines={4}
        />
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton label="Continue" onPress={() => navigation.navigate('WizardRefinedAudience')} disabled={!isValid} />
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  chipSelected: { backgroundColor: Colors.primaryFixed, borderColor: Colors.primary },
  chipText: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  chipTextSelected: { color: Colors.primary, fontWeight: '600' },
  textArea: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.md,
    ...Typography.bodyBase,
    color: Colors.onSurface,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  footer: { padding: Spacing.gutter, paddingBottom: Spacing.lg },
});
