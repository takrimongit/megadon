import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp as Nsnp } from '@react-navigation/native-stack';
import type { BrandAnalysis } from '@megadon/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import OnboardingProgress from '../../components/OnboardingProgress';
import PrimaryButton from '../../components/PrimaryButton';
import AppHeader from '../../components/AppHeader';
import LoadingSpinner from '../../components/LoadingSpinner';
import { RootStackParamList } from '../../navigation';
import { useOnboarding } from '../../lib/OnboardingContext';
import { api } from '../../lib/api';

type Nav = Nsnp<RootStackParamList>;

function EditableTextSection({
  title,
  value,
  multiline = true,
  onSave,
}: {
  title: string;
  value: string;
  multiline?: boolean;
  onSave: (next: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(value), [value]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        {!editing ? (
          <TouchableOpacity onPress={() => setEditing(true)} style={styles.editBtn}>
            <MaterialIcons name="edit" size={16} color={Colors.primary} />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => { setDraft(value); setEditing(false); }}>
              <Text style={[styles.editText, { color: Colors.onSurfaceVariant }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.editText, { color: Colors.primary }]}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      {editing ? (
        <TextInput
          style={[styles.input, multiline && styles.textarea]}
          value={draft}
          onChangeText={setDraft}
          multiline={multiline}
        />
      ) : (
        <Text style={styles.cardBody}>{value || '—'}</Text>
      )}
    </View>
  );
}

function ChipListSection({
  title,
  items,
  onSave,
}: {
  title: string;
  items: string[];
  onSave: (next: string[]) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(items.join(', '));
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(items.join(', ')), [items]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const next = draft.split(',').map((s) => s.trim()).filter(Boolean);
      await onSave(next);
      setEditing(false);
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        {!editing ? (
          <TouchableOpacity onPress={() => setEditing(true)} style={styles.editBtn}>
            <MaterialIcons name="edit" size={16} color={Colors.primary} />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => { setDraft(items.join(', ')); setEditing(false); }}>
              <Text style={[styles.editText, { color: Colors.onSurfaceVariant }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.editText, { color: Colors.primary }]}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      {editing ? (
        <>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={draft}
            onChangeText={setDraft}
            multiline
            placeholder="Comma-separated values"
            placeholderTextColor={Colors.onSurfaceVariant + '80'}
          />
          <Text style={styles.helper}>Comma-separated</Text>
        </>
      ) : (
        <View style={styles.chipRow}>
          {items.length === 0 ? (
            <Text style={styles.cardBody}>—</Text>
          ) : (
            items.map((t, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>{t}</Text>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}

export default function OnboardingReviewScreen() {
  const navigation = useNavigation<Nav>();
  const { playbook } = useOnboarding();
  const [approving, setApproving] = useState(false);

  const analysis = playbook?.analysis;

  const patch = async (update: Partial<BrandAnalysis>) => {
    await api.updateBrandPlaybook({ analysis: update });
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      await api.approveBrandPlaybook();
      Alert.alert(
        'Brand setup complete',
        'Your AI now understands your brand and is ready to generate high-performing ads.',
        [
          {
            text: 'Continue',
            onPress: () => navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'MainTabs' }] })),
          },
        ],
      );
    } catch (e) {
      Alert.alert('Could not approve', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setApproving(false);
    }
  };

  if (!analysis) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader showBack onBack={() => navigation.goBack()} />
        <OnboardingProgress step={5} label="Review & Approve" />
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AppHeader showBack onBack={() => navigation.goBack()} />
      <OnboardingProgress step={5} label="Review & Approve" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.finalBadge}>
          <MaterialIcons name="flag" size={14} color={Colors.secondary} />
          <Text style={styles.finalBadgeText}>FINAL STEP</Text>
        </View>
        <Text style={styles.title}>Review & approve your playbook</Text>
        <Text style={styles.subtitle}>
          Tap any section to refine. Once approved, every future ad will be generated with this context.
        </Text>

        <EditableTextSection
          title="Brand Voice"
          value={analysis.toneOfVoice}
          onSave={(next) => patch({ toneOfVoice: next })}
        />

        <EditableTextSection
          title="Visual Guidelines"
          value={analysis.visualStyle}
          onSave={(next) => patch({ visualStyle: next })}
        />

        <EditableTextSection
          title="Messaging Style"
          value={analysis.messagingStyle}
          onSave={(next) => patch({ messagingStyle: next })}
        />

        <ChipListSection
          title="CTA Preferences"
          items={analysis.ctaPreferences}
          onSave={(next) => patch({ ctaPreferences: next })}
        />

        <ChipListSection
          title="Approved Creative Styles"
          items={analysis.creativeStyles}
          onSave={(next) => patch({ creativeStyles: next })}
        />

        <ChipListSection
          title="Brand Rules"
          items={analysis.brandRules}
          onSave={(next) => patch({ brandRules: next })}
        />
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label="Complete Setup"
          onPress={handleApprove}
          loading={approving}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.gutter, gap: Spacing.md, paddingBottom: Spacing.xl },
  finalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondary + '1A',
  },
  finalBadgeText: { ...Typography.labelCaps, color: Colors.secondary, textTransform: 'uppercase' },
  title: { ...Typography.headlineMd, color: Colors.onSurface },
  subtitle: { ...Typography.bodyBase, color: Colors.onSurfaceVariant },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { ...Typography.titleMd, color: Colors.onSurface },
  cardBody: { ...Typography.bodyBase, color: Colors.onSurfaceVariant },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editText: { ...Typography.bodySm, color: Colors.primary, fontWeight: '600' },
  input: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.md,
    ...Typography.bodyBase,
    color: Colors.onSurface,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  helper: { ...Typography.labelCaps, color: Colors.onSurfaceVariant },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryFixed,
  },
  chipText: { ...Typography.bodySm, color: Colors.primary, fontWeight: '500' },
  footer: { padding: Spacing.gutter },
});
