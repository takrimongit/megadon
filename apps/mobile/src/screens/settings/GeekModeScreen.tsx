import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Switch, TextInput, Alert,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import type { GeekSettings, GeekDefaults } from '@megadon/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import PrimaryButton from '../../components/PrimaryButton';
import LoadingSpinner from '../../components/LoadingSpinner';
import { api } from '../../lib/api';
import { RootStackParamList } from '../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type ChatKey = 'chat' | 'revise' | 'personas' | 'analyze';
type MediaKey = 'image' | 'video';

interface ChatSection {
  key: ChatKey;
  title: string;
  description: string;
}
interface MediaSection {
  key: MediaKey;
  title: string;
  description: string;
}

const CHAT_SECTIONS: ChatSection[] = [
  { key: 'chat', title: 'Ad Copy Generation', description: 'Model + system prompt used to write headlines, body, hook and CTA for each new ad.' },
  { key: 'revise', title: 'Ad Copy Revisions', description: 'Used when a reviewer asks for changes on an existing ad.' },
  { key: 'personas', title: 'Audience Personas', description: 'Suggests 3 personas in the wizard from age/interest input.' },
  { key: 'analyze', title: 'Brand Analysis', description: 'Builds the brand playbook from your uploaded info.' },
];

const MEDIA_SECTIONS: MediaSection[] = [
  { key: 'image', title: 'Image Creative', description: 'Model + prompt template for the FLUX image generation step.' },
  { key: 'video', title: 'Video Creative', description: 'Model + prompt template for Veo video generation.' },
];

export default function GeekModeScreen() {
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<GeekSettings | null>(null);
  const [defaults, setDefaults] = useState<GeekDefaults | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const [s, d] = await Promise.all([api.getGeekSettings(), api.getGeekDefaults()]);
        setSettings(s);
        setDefaults(d);
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
      const existing: any = (s[key] as any) ?? {};
      return { ...s, [key]: { ...existing, [field]: value } } as GeekSettings;
    });
  }, []);

  const updateMedia = useCallback((key: MediaKey, field: 'model' | 'promptTemplate', value: string) => {
    setSettings((s) => {
      if (!s) return s;
      const existing: any = (s[key] as any) ?? {};
      return { ...s, [key]: { ...existing, [field]: value } } as GeekSettings;
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

  const copy = useCallback(async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'Default prompt copied to clipboard.');
  }, []);

  if (loading || !settings || !defaults) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader title="Geek Mode" showBack onBack={() => navigation.goBack()} />
        <View style={styles.center}><LoadingSpinner /></View>
      </SafeAreaView>
    );
  }

  const renderModelChips = (models: string[], selected: string | undefined, onPick: (m: string) => void) => (
    <View style={styles.chipRow}>
      {models.map((m) => {
        const active = selected === m;
        return (
          <TouchableOpacity
            key={m}
            onPress={() => onPick(m)}
            style={[styles.chip, active && styles.chipActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{m}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderDefaultBlock = (
    sectionKey: string,
    label: string,
    defaultText: string,
    onUseDefault: () => void,
  ) => {
    const open = !!expanded[sectionKey];
    return (
      <View style={styles.defaultBlock}>
        <TouchableOpacity
          onPress={() => setExpanded((e) => ({ ...e, [sectionKey]: !open }))}
          style={styles.defaultHeader}
          activeOpacity={0.7}
        >
          <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={18} color={Colors.primary} />
          <Text style={styles.defaultHeaderText}>{label}</Text>
        </TouchableOpacity>
        {open ? (
          <>
            <ScrollView
              style={styles.defaultBody}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              <Text style={styles.defaultText}>{defaultText}</Text>
            </ScrollView>
            <View style={styles.defaultActions}>
              <TouchableOpacity onPress={() => copy(defaultText)} style={styles.defaultActionBtn} activeOpacity={0.7}>
                <MaterialIcons name="content-copy" size={14} color={Colors.primary} />
                <Text style={styles.defaultActionText}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onUseDefault} style={styles.defaultActionBtn} activeOpacity={0.7}>
                <MaterialIcons name="content-paste" size={14} color={Colors.primary} />
                <Text style={styles.defaultActionText}>Use as starting point</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </View>
    );
  };

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

          <View style={styles.varsCard}>
            <Text style={styles.varsTitle}>Template variables</Text>
            <Text style={styles.varsBody}>
              Prompt templates use mustache syntax. Available variables:
            </Text>
            <Text style={styles.varsMono}>
              {[...defaults.variables.common, ...defaults.variables.brief, ...defaults.variables.copy, ...defaults.variables.brand].join('  ')}
            </Text>
          </View>

          <Text style={styles.sectionGroupLabel}>Text / Chat surfaces</Text>
          {CHAT_SECTIONS.map((s) => {
            const cur: { model?: string; systemPrompt?: string } = (settings[s.key] as any) ?? {};
            const def = defaults[s.key];
            return (
              <View key={s.key} style={styles.section}>
                <Text style={styles.sectionTitle}>{s.title}</Text>
                <Text style={styles.sectionDesc}>{s.description}</Text>

                <Text style={styles.fieldLabel}>Model</Text>
                {renderModelChips(def.models, cur.model ?? def.defaultModel, (m) =>
                  updateChat(s.key, 'model', m),
                )}
                <TextInput
                  style={styles.input}
                  placeholder={`Or type any kie.ai model id. Default: ${def.defaultModel}`}
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
                {renderDefaultBlock(
                  `${s.key}-system`,
                  'View platform default system prompt',
                  def.systemPrompt,
                  () => updateChat(s.key, 'systemPrompt', def.systemPrompt),
                )}
              </View>
            );
          })}

          <Text style={styles.sectionGroupLabel}>Media surfaces</Text>
          {MEDIA_SECTIONS.map((s) => {
            const cur: { model?: string; promptTemplate?: string } = (settings[s.key] as any) ?? {};
            const def = defaults[s.key];
            return (
              <View key={s.key} style={styles.section}>
                <Text style={styles.sectionTitle}>{s.title}</Text>
                <Text style={styles.sectionDesc}>{s.description}</Text>

                <Text style={styles.fieldLabel}>Model</Text>
                {renderModelChips(def.models, cur.model ?? def.defaultModel, (m) =>
                  updateMedia(s.key, 'model', m),
                )}
                <TextInput
                  style={styles.input}
                  placeholder={`Or type any kie.ai model id. Default: ${def.defaultModel}`}
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
                {renderDefaultBlock(
                  `${s.key}-template`,
                  'View platform default prompt template',
                  def.promptTemplate,
                  () => updateMedia(s.key, 'promptTemplate', def.promptTemplate),
                )}
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
  content: { padding: Spacing.gutter, paddingBottom: Spacing.xl * 2 },
  masterRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.lg,
  },
  masterTitle: { ...Typography.titleMd, color: Colors.onSurface, marginBottom: 4 },
  masterDesc: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  varsCard: {
    backgroundColor: Colors.primaryContainer + '33',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
  },
  varsTitle: { ...Typography.labelCaps, color: Colors.primary, marginBottom: 4 },
  varsBody: { ...Typography.bodySm, color: Colors.onSurfaceVariant, marginBottom: Spacing.xs },
  varsMono: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    color: Colors.onSurface,
    lineHeight: 18,
  },
  sectionGroupLabel: {
    ...Typography.labelCaps, color: Colors.onSurfaceVariant,
    marginTop: Spacing.md, marginBottom: Spacing.sm,
  },
  section: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  sectionTitle: { ...Typography.titleMd, color: Colors.onSurface, marginBottom: 2 },
  sectionDesc: { ...Typography.bodySm, color: Colors.onSurfaceVariant, marginBottom: Spacing.sm },
  fieldLabel: {
    ...Typography.labelCaps, color: Colors.onSurfaceVariant,
    marginTop: Spacing.sm, marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.outlineVariant,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm,
    color: Colors.onSurface,
    fontFamily: 'JetBrainsMono_400Regular', fontSize: 13,
  },
  textarea: { minHeight: 110 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 11, color: Colors.onSurfaceVariant },
  chipTextActive: { color: Colors.onPrimary },
  defaultBlock: {
    marginTop: Spacing.sm,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    overflow: 'hidden',
  },
  defaultHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 8,
  },
  defaultHeaderText: { ...Typography.labelCaps, color: Colors.primary },
  defaultBody: { maxHeight: 220, paddingHorizontal: Spacing.sm },
  defaultText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    lineHeight: 17,
    color: Colors.onSurface,
    paddingVertical: 6,
  },
  defaultActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
  },
  defaultActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8,
  },
  defaultActionText: { ...Typography.labelCaps, color: Colors.primary },
});
