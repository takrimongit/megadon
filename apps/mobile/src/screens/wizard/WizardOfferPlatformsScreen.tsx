import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
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

const platforms = [
  { id: 'instagram', icon: 'photo-camera', label: 'Instagram', formats: 'Reels, Stories, Feed' },
  { id: 'tiktok', icon: 'music-video', label: 'TikTok', formats: 'Short-form Video' },
  { id: 'facebook', icon: 'facebook', label: 'Facebook', formats: 'Feed, Stories, Reels' },
  { id: 'youtube', icon: 'play-circle', label: 'YouTube', formats: 'Shorts, In-stream' },
  { id: 'linkedin', icon: 'work', label: 'LinkedIn', formats: 'Feed, Stories' },
];

export default function WizardOfferPlatformsScreen() {
  const navigation = useNavigation<Nav>();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [offer, setOffer] = useState('');
  const [batchSize, setBatchSize] = useState('10');

  const toggle = (id: string) =>
    setSelectedPlatforms((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const isValid = selectedPlatforms.length > 0 && offer.length > 5;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AppHeader showBack onBack={() => navigation.goBack()} />
      <WizardProgress currentStep={4} totalSteps={6} stepLabel="Offer & Platforms" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>What's your offer?</Text>
        <Text style={styles.subtitle}>Tell AI about your product or promotion to craft the right message.</Text>

        <Text style={styles.fieldLabel}>YOUR OFFER / PRODUCT</Text>
        <TextInput
          style={styles.input}
          value={offer}
          onChangeText={setOffer}
          placeholder="e.g. 30% off summer collection, limited time..."
          placeholderTextColor={Colors.onSurfaceVariant + '80'}
        />

        <Text style={styles.fieldLabel}>TARGET PLATFORMS</Text>
        {platforms.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.platformCard, selectedPlatforms.includes(p.id) && styles.platformCardSelected]}
            onPress={() => toggle(p.id)}
            activeOpacity={0.8}
          >
            <MaterialIcons name={p.icon as any} size={22} color={selectedPlatforms.includes(p.id) ? Colors.primary : Colors.onSurfaceVariant} />
            <View style={styles.platformText}>
              <Text style={[styles.platformName, selectedPlatforms.includes(p.id) && styles.platformNameSelected]}>{p.label}</Text>
              <Text style={styles.platformFormats}>{p.formats}</Text>
            </View>
            {selectedPlatforms.includes(p.id) && (
              <MaterialIcons name="check-circle" size={20} color={Colors.primary} />
            )}
          </TouchableOpacity>
        ))}

        <Text style={styles.fieldLabel}>BATCH SIZE</Text>
        <View style={styles.batchSizeRow}>
          {['5', '10', '20', '30'].map((size) => (
            <TouchableOpacity
              key={size}
              style={[styles.sizeChip, batchSize === size && styles.sizeChipSelected]}
              onPress={() => setBatchSize(size)}
              activeOpacity={0.8}
            >
              <Text style={[styles.sizeChipText, batchSize === size && styles.sizeChipTextSelected]}>{size} ads</Text>
            </TouchableOpacity>
          ))}
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
