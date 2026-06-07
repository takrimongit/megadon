import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Platform } from '@megadon/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import WizardProgress from '../../components/WizardProgress';
import PrimaryButton from '../../components/PrimaryButton';
import { RootStackParamList } from '../../navigation';
import { useWizard } from '../../lib/WizardContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function WizardOfferPlatformsScreen() {
  const navigation = useNavigation<Nav>();
  const { state, update } = useWizard();

  const platforms = state.options?.platforms ?? [];

  const togglePlatform = (id: Platform) => {
    const next = state.platforms.includes(id)
      ? state.platforms.filter((x) => x !== id)
      : [...state.platforms, id];
    update({ platforms: next });
  };

  const isValid = state.platforms.length > 0 && state.offer.length > 5;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AppHeader showBack onBack={() => navigation.goBack()} />
      <WizardProgress currentStep={4} totalSteps={6} stepLabel="Offer & Platforms" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Text style={styles.title}>What's your offer?</Text>
        <Text style={styles.subtitle}>Tell AI about your product or promotion to craft the right message.</Text>

        <Text style={styles.fieldLabel}>YOUR OFFER / PRODUCT</Text>
        <TextInput
          style={styles.input}
          value={state.offer}
          onChangeText={(offer) => update({ offer })}
          placeholder="e.g. 30% off summer collection, limited time..."
          placeholderTextColor={Colors.onSurfaceVariant + '80'}
        />

        <Text style={styles.fieldLabel}>TARGET PLATFORMS</Text>
        {platforms.map((p) => {
          const selected = state.platforms.includes(p.id);
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.platformCard, selected && styles.platformCardSelected]}
              onPress={() => togglePlatform(p.id)}
              activeOpacity={0.8}
            >
              <MaterialIcons name={p.icon as keyof typeof MaterialIcons.glyphMap} size={22} color={selected ? Colors.primary : Colors.onSurfaceVariant} />
              <View style={styles.platformText}>
                <Text style={[styles.platformName, selected && styles.platformNameSelected]}>{p.label}</Text>
                <Text style={styles.platformFormats}>{p.formats}</Text>
              </View>
              {selected && (
                <MaterialIcons name="check-circle" size={20} color={Colors.primary} />
              )}
            </TouchableOpacity>
          );
        })}

        <Text style={styles.fieldLabel}>BATCH SIZE</Text>
        <View style={styles.batchSizeRow}>
          {[5, 10, 20, 30].map((size) => {
            const selected = state.batchSize === size;
            return (
              <TouchableOpacity
                key={size}
                style={[styles.sizeChip, selected && styles.sizeChipSelected]}
                onPress={() => update({ batchSize: size })}
                activeOpacity={0.8}
              >
                <Text style={[styles.sizeChipText, selected && styles.sizeChipTextSelected]}>{size} ads</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton label="Continue" onPress={() => navigation.navigate('WizardCreativeStyle')} disabled={!isValid} />
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
  input: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.md,
    ...Typography.bodyBase,
    color: Colors.onSurface,
  },
  platformCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant + '66',
  },
  platformCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryFixed },
  platformText: { flex: 1 },
  platformName: { ...Typography.bodySm, color: Colors.onSurface, fontWeight: '600' },
  platformNameSelected: { color: Colors.primary },
  platformFormats: { ...Typography.labelCaps, color: Colors.onSurfaceVariant },
  batchSizeRow: { flexDirection: 'row', gap: Spacing.sm },
  sizeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
  },
  sizeChipSelected: { backgroundColor: Colors.primaryFixed, borderColor: Colors.primary },
  sizeChipText: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  sizeChipTextSelected: { color: Colors.primary, fontWeight: '700' },
  footer: { padding: Spacing.gutter, paddingBottom: Spacing.lg },
});
