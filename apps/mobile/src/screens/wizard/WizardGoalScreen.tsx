import React, { useState } from 'react';
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

const goals = [
  { id: 'awareness', icon: 'campaign', label: 'Brand Awareness', desc: 'Reach new audiences and increase visibility' },
  { id: 'conversion', icon: 'shopping-cart', label: 'Drive Conversions', desc: 'Turn viewers into buyers with compelling CTAs' },
  { id: 'engagement', icon: 'favorite', label: 'Boost Engagement', desc: 'Increase likes, shares, and comments' },
  { id: 'retention', icon: 'repeat', label: 'Customer Retention', desc: 'Re-engage existing customers with offers' },
];

export default function WizardGoalScreen() {
  const navigation = useNavigation<Nav>();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AppHeader showBack onBack={() => navigation.goBack()} />
      <WizardProgress currentStep={1} totalSteps={6} stepLabel="Campaign Goal" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>What's your campaign goal?</Text>
        <Text style={styles.subtitle}>AdForge AI will tailor creative strategies to your objective.</Text>
        {goals.map((goal) => (
          <TouchableOpacity
            key={goal.id}
            style={[styles.optionCard, selected === goal.id && styles.optionCardSelected]}
            onPress={() => setSelected(goal.id)}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIcon, selected === goal.id && styles.optionIconSelected]}>
              <MaterialIcons name={goal.icon as any} size={22} color={selected === goal.id ? Colors.onPrimary : Colors.primary} />
            </View>
            <View style={styles.optionText}>
              <Text style={[styles.optionLabel, selected === goal.id && styles.optionLabelSelected]}>{goal.label}</Text>
              <Text style={styles.optionDesc}>{goal.desc}</Text>
            </View>
            {selected === goal.id && (
              <MaterialIcons name="check-circle" size={22} color={Colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton label="Continue" onPress={() => navigation.navigate('WizardAudience')} disabled={!selected} />
      </View>
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
