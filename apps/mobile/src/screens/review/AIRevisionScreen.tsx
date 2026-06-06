import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import PrimaryButton from '../../components/PrimaryButton';

const suggestions = [
  'Make the headline more urgent',
  'Use a more conversational tone',
  'Emphasize the discount more',
  'Add social proof element',
  'Shorten the copy',
];

export default function AIRevisionScreen() {
  const navigation = useNavigation();
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [revised, setRevised] = useState(false);

  const handleRevise = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); setRevised(true); }, 2000);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AppHeader showBack onBack={() => navigation.goBack()} title="AI Revision" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.adPreview}>
          <MaterialIcons name="image" size={40} color={Colors.outlineVariant} />
          <Text style={styles.adHeadline}>{revised ? 'Limited Time Only — 30% Off Ends Tonight!' : 'Limited Time: 30% Off'}</Text>
          <Text style={styles.adBody}>{revised
            ? 'Over 10,000 shoppers grabbed their favorites this week. Join them before it\'s gone. ⏰'
            : 'Shop our summer collection with exclusive discounts.'
          }</Text>
          <View style={styles.ctaRow}>
            <View style={styles.ctaBtn}><Text style={styles.ctaText}>Shop Now</Text></View>
          </View>
        </View>

        {revised && (
          <View style={styles.revisionNote}>
            <MaterialIcons name="auto-awesome" size={16} color={Colors.secondary} />
            <Text style={styles.revisionNoteText}>AI added urgency language and social proof based on your instruction.</Text>
          </View>
        )}

        <Text style={styles.fieldLabel}>QUICK SUGGESTIONS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll}>
          <View style={styles.suggestionsRow}>
            {suggestions.map((s) => (
              <TouchableOpacity key={s} style={styles.suggestionChip} onPress={() => setInstruction(s)} activeOpacity={0.8}>
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.fieldLabel}>CUSTOM INSTRUCTION</Text>
        <TextInput
          style={styles.input}
          value={instruction}
          onChangeText={setInstruction}
          placeholder="Tell AI what to change..."
          placeholderTextColor={Colors.onSurfaceVariant + '80'}
          multiline
          numberOfLines={3}
        />

        <View style={styles.actions}>
          <PrimaryButton label={loading ? 'Revising...' : 'Revise with AI'} onPress={handleRevise} loading={loading} disabled={!instruction} style={{ flex: 1 }} />
          {revised && (
            <TouchableOpacity style={styles.approveBtn} onPress={() => navigation.goBack()}>
              <MaterialIcons name="check" size={20} color={Colors.success} />
              <Text style={styles.approveBtnText}>Approve</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: Spacing.gutter, gap: Spacing.md, paddingBottom: 32 },
  adPreview: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
  },
  adHeadline: { ...Typography.titleMd, color: Colors.onSurface, textAlign: 'center' },
  adBody: { ...Typography.bodySm, color: Colors.onSurfaceVariant, textAlign: 'center' },
  ctaRow: { marginTop: Spacing.sm },
  ctaBtn: {
    paddingHorizontal: Spacing.lg, paddingVertical: 10,
    backgroundColor: Colors.primary, borderRadius: Radius.DEFAULT,
  },
  ctaText: { ...Typography.titleMd, color: Colors.onPrimary },
  revisionNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: Spacing.md,
    backgroundColor: Colors.secondary + '0F',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.secondary + '33',
  },
  revisionNoteText: { ...Typography.bodySm, color: Colors.secondary, flex: 1 },
  fieldLabel: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, textTransform: 'uppercase' },
  suggestionsScroll: { marginHorizontal: -Spacing.gutter },
  suggestionsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.gutter, paddingVertical: 2 },
  suggestionChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  suggestionText: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  input: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.md,
    ...Typography.bodyBase,
    color: Colors.onSurface,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderRadius: Radius.DEFAULT,
    backgroundColor: Colors.success + '1A',
    borderWidth: 1,
    borderColor: Colors.success + '33',
  },
  approveBtnText: { ...Typography.titleMd, color: Colors.success },
});
