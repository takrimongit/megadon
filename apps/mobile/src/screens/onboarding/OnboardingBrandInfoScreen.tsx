import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform as RNPlatform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BrandInfo } from '@megadon/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import OnboardingProgress from '../../components/OnboardingProgress';
import PrimaryButton from '../../components/PrimaryButton';
import AppHeader from '../../components/AppHeader';
import { RootStackParamList } from '../../navigation';
import { api } from '../../lib/api';
import { useOnboarding } from '../../lib/OnboardingContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const INDUSTRIES = [
  'Technology & Software',
  'Fashion & Apparel',
  'Finance & Fintech',
  'Healthcare & Wellness',
  'Food & Beverage',
  'Travel & Hospitality',
  'Beauty & Cosmetics',
  'E-commerce & Retail',
  'Education',
  'Real Estate',
  'Other',
];

export default function OnboardingBrandInfoScreen() {
  const navigation = useNavigation<Nav>();
  const { playbook } = useOnboarding();
  const [companyName, setCompanyName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [showIndustryPicker, setShowIndustryPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Hydrate from existing playbook (resume case).
  useEffect(() => {
    const info = playbook?.info;
    if (info) {
      setCompanyName(info.companyName);
      setWebsiteUrl(info.websiteUrl ?? '');
      setIndustry(info.industry);
      setDescription(info.description);
    }
  }, [playbook?.info]);

  const valid =
    companyName.trim().length > 0 &&
    industry.trim().length > 0 &&
    description.trim().length >= 10;

  const handleContinue = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const info: BrandInfo = {
        companyName: companyName.trim(),
        websiteUrl: websiteUrl.trim() || undefined,
        industry,
        description: description.trim(),
      };
      await api.updateBrandInfo(info);
      navigation.navigate('OnboardingUploadAssets');
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AppHeader showBack onBack={() => navigation.goBack()} />
      <OnboardingProgress step={2} label="Brand Information" />

      <KeyboardAvoidingView
        behavior={RNPlatform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Tell us about your company</Text>
          <Text style={styles.subtitle}>
            These details power your brand intelligence playbook.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>COMPANY NAME</Text>
            <TextInput
              style={styles.input}
              value={companyName}
              onChangeText={setCompanyName}
              placeholder="Acme Co"
              placeholderTextColor={Colors.onSurfaceVariant + '80'}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>WEBSITE URL</Text>
            <TextInput
              style={styles.input}
              value={websiteUrl}
              onChangeText={setWebsiteUrl}
              placeholder="https://acme.com"
              placeholderTextColor={Colors.onSurfaceVariant + '80'}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>INDUSTRY</Text>
            <TouchableOpacity
              style={[styles.input, styles.picker]}
              onPress={() => setShowIndustryPicker((v) => !v)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.pickerText,
                  !industry && { color: Colors.onSurfaceVariant + '80' },
                ]}
              >
                {industry || 'Select your industry'}
              </Text>
              <MaterialIcons
                name={showIndustryPicker ? 'expand-less' : 'expand-more'}
                size={22}
                color={Colors.onSurfaceVariant}
              />
            </TouchableOpacity>
            {showIndustryPicker && (
              <View style={styles.pickerList}>
                {INDUSTRIES.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={styles.pickerRow}
                    onPress={() => {
                      setIndustry(opt);
                      setShowIndustryPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerRowText, industry === opt && styles.pickerRowTextActive]}>
                      {opt}
                    </Text>
                    {industry === opt && (
                      <MaterialIcons name="check" size={18} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>SHORT BUSINESS DESCRIPTION</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={description}
              onChangeText={setDescription}
              placeholder="What does your company do? Who do you serve?"
              placeholderTextColor={Colors.onSurfaceVariant + '80'}
              multiline
              numberOfLines={4}
            />
            <Text style={styles.help}>{description.trim().length}/min 10 characters</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <PrimaryButton
          label="Continue"
          onPress={handleContinue}
          disabled={!valid || saving}
          loading={saving}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.gutter, gap: Spacing.md, paddingBottom: Spacing.xl },
  title: { ...Typography.headlineMd, color: Colors.onSurface },
  subtitle: { ...Typography.bodyBase, color: Colors.onSurfaceVariant, marginBottom: Spacing.sm },
  field: { gap: 6 },
  label: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, textTransform: 'uppercase' },
  input: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.md,
    ...Typography.bodyBase,
    color: Colors.onSurface,
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  help: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, marginTop: 2 },
  picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerText: { ...Typography.bodyBase, color: Colors.onSurface },
  pickerList: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    overflow: 'hidden',
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant + '33',
  },
  pickerRowText: { ...Typography.bodyBase, color: Colors.onSurface },
  pickerRowTextActive: { color: Colors.primary, fontWeight: '600' },
  footer: { padding: Spacing.gutter },
});
