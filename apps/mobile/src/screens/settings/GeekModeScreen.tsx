import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Switch, TextInput, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { GeekSettings } from '@megadon/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import PrimaryButton from '../../components/PrimaryButton';
import LoadingSpinner from '../../components/LoadingSpinner';
import { api } from '../../lib/api';
import { RootStackParamList } from '../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Each surface is one section on the settings screen. We keep the keys
// aligned 1:1 with the backend GeekSettings shape so save logic stays simple.
type ChatKey = 'chat' | 'revise' | 'personas' | 'analyze';
type MediaKey = 'image' | 'video';

interface ChatSection {
  key: ChatKey;
  title: string;
  description: string;
  defaultModel: string;
}

interface MediaSection {
  key: MediaKey;
  title: string;
  description: string;
  defaultModel: string;
  defaultPromptHint: string;
}

const CHAT_SECTIONS: ChatSection[] = [
  { key: 'chat', title: 'Ad Copy Generation', description: 'Model + system prompt used to write headlines, body, hook and CTA for each new ad.', defaultModel: 'gpt-5-2' },
  { key: 'revise', title: 'Ad Copy Revisions', description: 'Used when a reviewer asks for changes on an existing ad.', defaultModel: 'gpt-5-2' },
  { key: 'personas', title: 'Audience Personas', description: 'Suggests 3 personas in the wizard from age/interest input.', defaultModel: 'gpt-5-2' },
  { key: 'analyze', title: 'Brand Analysis', description: 'Builds the brand playbook from your uploaded info.', defaultModel: 'gemini-2.5-flash' },
];

const MEDIA_SECTIONS: MediaSection[] = [
  {
    key: 'image',
    title: 'Image Creative',
    description: 'Model + prompt template for the FLUX image generation step.',
    defaultModel: 'flux-2/pro-text-to-image',
    defaultPromptHint: 'Available variables: {{platform}}, {{brief.offer}}, {{brief.creativeStyle}}, {{copy.headline}}, {{copy.body}}, {{brand.companyName}}, {{brand.colorHexes}}, {{brand.toneOfVoice}}, {{brand.visualStyle}}, {{brand.brandRules}}',
  },
  {
    key: 'video',
    title: 'Video Creative',
    description: 'Model + prompt template for Veo video generation.',
    defaultModel: 'veo3_lite',
    defaultPromptHint: 'Same variables as image. Add motion direction.',
  },
];

export default function GeekModeScreen() {
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<GeekSettings | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getGeekSettings();
        setSettings(data);
      } catch (e: any) {
        Alert.alert('Could not load Geek Mode settings', e?.message ?? 'Unknown error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateChat = useCallback((key: ChatKey, field: 'model' | 'systemPrompt', value: string) => {
    setSettings((s) => {
      if (!s) return s;
      const existing = (s[key] as any) ?? {};
      return { ...s, [key]: { ...existing, [field]: value } };
    });
  }, []);

  const updateMedia = useCallback((key: MediaKey, field: 'model' | 'promptTemplate', value: string) => {
    setSettings((s) => {
      if (!s) return s;
      const existing = (s[key] as any) ?? {};
      return { ...s, [key]: { ...existing, [field]: value } };
    });
  }, []);

  const onSave = useCallback(async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const next = await api.updateGeekSettings({
        enabled: settings.enabled,
        chat: settings.chat,
        revise: settings.revise,
        personas: settings.personas,
        analyze: settings.analyze,
        image: settings.image,
        video: settings.video,
      });
      setSettings(next);
      Alert.alert('Saved', 'Geek Mode settings updated.');
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Unknown error');
    } finally {
      setSaving(false);
    }
  }, [settings]);

  if (loading || !settings) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader title="Geek Mode" showBack onBack={() => navigation.goBack()} />
        <View style={styles.center}><LoadingSpinner /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title="Geek Mode" showBack onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.masterRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.masterTitle}>Enable Geek Mode</Text>
              <Text style={styles.masterDesc}>
                Override the default models and prompts used by each AI surface in the platform.
                When off, all overrides are ignored and platform defaults are used.
              </Text>
            </View>
            <Switch
              value={Boolean(settings.enabled)}
              onValueChange={(v) => setSettings({ ...settings, enabled: v } as GeekSettings)}
              trackColor={{ false: Colors.outlineVariant, true: Colors.primary }}
              thumbColor={Colors.surface}
            />
          </View>

          <Text style={styles.sectionGroupLabel}>Text / Chat surfaces</Text>
          {CHAT_SECTIONS.map((s) => {
            const cur: { model?: string; systemPrompt?: string; promptTemplate?: string } = (settings[s.key] as any) ?? {};
            return (
              <View key={s.key} style={styles.section}>
                <Text style={styles.sectionTitle}>{s.title}</Text>
                <Text style={styles.sectionDesc}>{s.description}</Text>
                <Text style={styles.fieldLabel}>Model</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`Default: ${s.defaultModel}`}
                  placeholderTextColor={Colors.onSurfaceVariant}
                  value={cur.model ?? ''}
                  onChangeText={(t) => updateChat(s.key, 'model', t)}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.fieldLabel}>System Prompt</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  placeholder="Leave blank to use the platform default."
                  placeholderTextColor={Colors.onSurfaceVariant}
                  value={cur.systemPrompt ?? ''}
                  onChangeText={(t) => updateChat(s.key, 'systemPrompt', t)}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            );
          })}

          <Text style={styles.sectionGroupLabel}>Media surfaces</Text>
          {MEDIA_SECTIONS.map((s) => {
            const cur: { model?: string; systemPrompt?: string; promptTemplate?: string } = (settings[s.key] as any) ?? {};
            return (
              <View key={s.key} style={styles.section}>
                <Text style={styles.sectionTitle}>{s.title}</Text>
                <Text style={styles.sectionDesc}>{s.description}</Text>
                <Text style={styles.fieldLabel}>Model</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`Default: ${s.defaultModel}`}
                  placeholderTextColor={Colors.onSurfaceVariant}
                  value={cur.model ?? ''}
                  onChangeText={(t) => updateMedia(s.key, 'model', t)}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.fieldLabel}>Prompt Template</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  placeholder="Leave blank to use the brand-aware default."
                  placeholderTextColor={Colors.onSurfaceVariant}
                  value={cur.promptTemplate ?? ''}
                  onChangeText={(t) => updateMedia(s.key, 'promptTemplate', t)}
                  multiline
                  textAlignVertical="top"
                />
                <Text style={styles.hint}>{s.defaultPromptHint}</Text>
              </View>
            );
          })}

          <PrimaryButton
            label={saving ? 'Saving…' : 'Save Geek Mode Settings'}
            onPress={onSave}
            loading={saving}
            disabled={saving}
            style={{ marginTop: Spacing.lg }}
          />
          <View style={{ height: Spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    padding: Spacing.gutter,
    paddingBottom: Spacing.xl * 2,
  },
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  masterTitle: { ...Typography.titleMd, color: Colors.onSurface, marginBottom: 4 },
  masterDesc: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  sectionGroupLabel: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  section: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: { ...Typography.titleMd, color: Colors.onSurface, marginBottom: 2 },
  sectionDesc: { ...Typography.bodySm, color: Colors.onSurfaceVariant, marginBottom: Spacing.sm },
  fieldLabel: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    color: Colors.onSurface,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 13,
  },
  textarea: { minHeight: 110 },
  hint: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
});
