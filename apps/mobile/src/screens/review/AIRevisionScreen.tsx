import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Ad, Revision } from '@megadon/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import PrimaryButton from '../../components/PrimaryButton';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorView from '../../components/ErrorView';
import AdImage from '../../components/AdImage';
import { RootStackParamList } from '../../navigation';
import { getDb } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { api } from '../../lib/api';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'AIRevision'>;

const suggestions = [
  'Make the headline more urgent',
  'Use a more conversational tone',
  'Emphasize the discount more',
  'Add social proof element',
  'Shorten the copy',
];

export default function AIRevisionScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { workspaceId } = useAuth();
  const { adId, batchId } = route.params;
  const [ad, setAd] = useState<Ad | null>(null);
  const [adError, setAdError] = useState<string | null>(null);
  const [instruction, setInstruction] = useState('');
  const [revisionId, setRevisionId] = useState<string | null>(null);
  const [revision, setRevision] = useState<Revision | null>(null);
  const [revisionImageUrl, setRevisionImageUrl] = useState<string | null>(null);
  const [revising, setRevising] = useState(false);
  const [accepting, setAccepting] = useState(false);

  // Subscribe to the ad doc.
  useEffect(() => {
    if (!workspaceId) return;
    const ref = doc(getDb(), `workspaces/${workspaceId}/batches/${batchId}/ads/${adId}`);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) setAd({ id: snap.id, ...snap.data() } as Ad);
      },
      (e) => setAdError(e.message),
    );
    return unsub;
  }, [workspaceId, batchId, adId]);

  // Subscribe to the revision doc once one is requested.
  useEffect(() => {
    if (!workspaceId || !revisionId) return;
    const ref = doc(
      getDb(),
      `workspaces/${workspaceId}/batches/${batchId}/ads/${adId}/revisions/${revisionId}`,
    );
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setRevision({ id: snap.id, ...snap.data() } as Revision);
    });
    return unsub;
  }, [workspaceId, batchId, adId, revisionId]);

  // Fetch the revision's regenerated image URL once it's ready.
  useEffect(() => {
    if (!revisionId || revision?.status !== 'ready' || !revision?.assetPath) return;
    let cancelled = false;
    (async () => {
      try {
        const { url } = await api.revisionSignedUrl(adId, revisionId);
        if (!cancelled) setRevisionImageUrl(url);
      } catch {
        // Fall back to the ad's original image.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adId, revisionId, revision?.status, revision?.assetPath]);

  const handleRevise = async () => {
    if (!instruction.trim()) return;
    setRevising(true);
    setRevision(null);
    setRevisionImageUrl(null);
    try {
      const { revisionId: rid } = await api.requestRevision(adId, instruction.trim());
      setRevisionId(rid);
    } catch (e) {
      Alert.alert('Revision failed', e instanceof Error ? e.message : 'Could not request revision.');
    } finally {
      setRevising(false);
    }
  };

  const handleAccept = async () => {
    if (!revisionId) return;
    setAccepting(true);
    try {
      await api.acceptRevision(adId, revisionId);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Accept failed', e instanceof Error ? e.message : 'Could not accept revision.');
    } finally {
      setAccepting(false);
    }
  };

  const revisionReady = revision?.status === 'ready';
  const revisionFailed = revision?.status === 'failed';
  const revisionLoading = revisionId !== null && !revisionReady && !revisionFailed;

  const displayHeadline = revisionReady ? revision?.headline ?? ad?.headline ?? '—' : ad?.headline ?? '—';
  const displayBody = revisionReady ? revision?.body ?? ad?.body : ad?.body;
  const displayCta = revisionReady ? revision?.cta ?? ad?.cta : ad?.cta;

  if (adError) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <AppHeader showBack onBack={() => navigation.goBack()} title="AI Revision" />
        <ErrorView message={adError} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AppHeader showBack onBack={() => navigation.goBack()} title="AI Revision" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
          {!ad ? (
            <LoadingSpinner label="Loading ad…" />
          ) : (
            <>
              <View style={styles.adPreview}>
                <AdImage
                  adId={ad.id}
                  hasAsset={!!ad.assetPath}
                  assetVersion={ad.assetPath}
                  style={styles.adImage}
                  imageStyle={styles.adImageInner}
                  fallbackIconSize={48}
                  zoomable
                  urlOverride={revisionImageUrl}
                />
                {ad.assetPath ? (
                  <Text style={styles.zoomHint}>Tap image to zoom</Text>
                ) : null}
                <Text style={styles.adHeadline}>{displayHeadline}</Text>
                {displayBody ? <Text style={styles.adBody}>{displayBody}</Text> : null}
                {displayCta ? (
                  <View style={styles.ctaRow}>
                    <View style={styles.ctaBtn}><Text style={styles.ctaText}>{displayCta}</Text></View>
                  </View>
                ) : null}
              </View>

              {revisionLoading && (
                <View style={styles.loadingNote}>
                  <LoadingSpinner label="Revising with AI…" style={{ minHeight: 80 }} />
                </View>
              )}

              {revisionReady && (
                <View style={styles.revisionNote}>
                  <MaterialIcons name="auto-awesome" size={16} color={Colors.secondary} />
                  <Text style={styles.revisionNoteText}>AI updated this ad based on your instruction.</Text>
                </View>
              )}

              {revisionFailed && (
                <View style={[styles.revisionNote, { backgroundColor: Colors.error + '0F', borderColor: Colors.error + '33' }]}>
                  <MaterialIcons name="error-outline" size={16} color={Colors.error} />
                  <Text style={[styles.revisionNoteText, { color: Colors.error }]}>The revision failed. Try a different instruction.</Text>
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
                <PrimaryButton
                  label={revising ? 'Revising…' : revisionReady ? 'Revise again' : 'Revise with AI'}
                  onPress={handleRevise}
                  loading={revising}
                  disabled={!instruction.trim() || revising || revisionLoading}
                  style={{ flex: 1 }}
                />
                {revisionReady && (
                  <TouchableOpacity style={styles.approveBtn} onPress={handleAccept} disabled={accepting}>
                    <MaterialIcons name="check" size={20} color={Colors.success} />
                    <Text style={styles.approveBtnText}>{accepting ? 'Saving…' : 'Accept & approve'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
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
  adImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.md,
    position: 'relative',
  },
  adImageInner: {
    resizeMode: 'contain',
  },
  zoomHint: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginTop: -Spacing.xs,
  },
  adHeadline: { ...Typography.titleMd, color: Colors.onSurface, textAlign: 'center' },
  adBody: { ...Typography.bodySm, color: Colors.onSurfaceVariant, textAlign: 'center' },
  ctaRow: { marginTop: Spacing.sm },
  ctaBtn: {
    paddingHorizontal: Spacing.lg, paddingVertical: 10,
    backgroundColor: Colors.primary, borderRadius: Radius.DEFAULT,
  },
  ctaText: { ...Typography.titleMd, color: Colors.onPrimary },
  loadingNote: {
    padding: Spacing.md,
    backgroundColor: Colors.primaryFixed,
    borderRadius: Radius.md,
  },
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
