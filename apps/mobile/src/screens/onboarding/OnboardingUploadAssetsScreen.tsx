import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { File, UploadType } from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BrandAsset, BrandAssetType } from '@megadon/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import OnboardingProgress from '../../components/OnboardingProgress';
import PrimaryButton from '../../components/PrimaryButton';
import AppHeader from '../../components/AppHeader';
import { RootStackParamList } from '../../navigation';
import { api } from '../../lib/api';
import { useOnboarding } from '../../lib/OnboardingContext';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SECTIONS: {
  type: BrandAssetType;
  label: string;
  helper: string;
  multiple: boolean;
  required?: boolean;
  minItems?: number;
}[] = [
  { type: 'logo', label: 'Main Brand Logo', helper: 'PNG, JPG, or SVG (Max 5 MB)', multiple: false, required: true },
  { type: 'image', label: 'Brand Images', helper: 'Add 3–10 examples of your visual style', multiple: true, required: true, minItems: 3 },
  { type: 'product', label: 'Product Images', helper: 'Optional — catalog photos & cutouts', multiple: true },
  { type: 'previous_ad', label: 'Past Advertisements', helper: 'Optional — what worked before', multiple: true },
  { type: 'social', label: 'Social Media Screenshots', helper: 'Optional — Instagram, TikTok, etc.', multiple: true },
];

async function uploadAsset(
  uri: string,
  type: BrandAssetType,
  filename?: string,
): Promise<BrandAsset> {
  // Infer mime from extension; fall back to image/jpeg.
  const ext = filename?.split('.').pop()?.toLowerCase() ?? uri.split('.').pop()?.toLowerCase();
  const mimeType =
    ext === 'png' ? 'image/png'
      : ext === 'webp' ? 'image/webp'
        : ext === 'gif' ? 'image/gif'
          : 'image/jpeg';

  const signed = await api.requestBrandUploadUrl(type, mimeType, filename);

  // RN's fetch can't make a Blob out of a file:// URI ("Creating blobs
  // from ArrayBuffer ... are not supported"). Use expo-file-system's
  // native binary upload instead.
  const file = new File(uri);
  const result = await file.upload(signed.url, {
    httpMethod: 'PUT',
    headers: { 'Content-Type': mimeType },
    uploadType: UploadType.BINARY_CONTENT,
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed (${result.status}): ${result.body?.slice(0, 200) ?? ''}`);
  }

  return api.registerBrandAsset({
    type,
    path: signed.assetPath,
    mimeType,
    filename,
  });
}

export default function OnboardingUploadAssetsScreen() {
  const navigation = useNavigation<Nav>();
  const { playbook, refresh } = useOnboarding();
  const [uploadingType, setUploadingType] = useState<BrandAssetType | null>(null);

  const assets = playbook?.assets ?? [];
  const byType = (t: BrandAssetType) => assets.filter((a) => a.type === t);

  const handlePick = async (type: BrandAssetType, multiple: boolean) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload brand assets.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: multiple,
      quality: 0.85,
      selectionLimit: multiple ? 10 : 1,
    });
    if (result.canceled || result.assets.length === 0) return;

    setUploadingType(type);
    try {
      for (const asset of result.assets) {
        await uploadAsset(asset.uri, type, asset.fileName ?? undefined);
      }
      await refresh();
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setUploadingType(null);
    }
  };

  const handleDelete = async (assetId: string) => {
    try {
      await api.deleteBrandAsset(assetId);
      await refresh();
    } catch (e) {
      Alert.alert('Could not delete', e instanceof Error ? e.message : 'Try again.');
    }
  };

  const logoOk = byType('logo').length > 0;
  const brandImagesOk = byType('image').length >= 3;
  const canContinue = logoOk && brandImagesOk;

  const handleContinue = async () => {
    try {
      await api.analyzeBrand();
      navigation.navigate('OnboardingAnalysis');
    } catch (e) {
      Alert.alert('Could not start analysis', e instanceof Error ? e.message : 'Try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AppHeader showBack onBack={() => navigation.goBack()} />
      <OnboardingProgress step={3} label="Upload Assets" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Upload brand assets</Text>
        <Text style={styles.subtitle}>
          The more examples you provide, the better AI can understand your visual identity and marketing style.
        </Text>

        {SECTIONS.map((sec) => {
          const items = byType(sec.type);
          const showAddTile = sec.multiple || items.length === 0;
          return (
            <View key={sec.type} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionLabel}>
                    {sec.label}
                    {sec.required && <Text style={{ color: Colors.error }}> *</Text>}
                  </Text>
                  <Text style={styles.sectionHelper}>{sec.helper}</Text>
                </View>
                {sec.minItems && (
                  <Text style={[styles.counter, items.length >= sec.minItems && styles.counterOk]}>
                    {items.length}/{sec.minItems}+
                  </Text>
                )}
              </View>

              <View style={styles.grid}>
                {items.map((asset) => (
                  <View key={asset.id} style={styles.tile}>
                    <Image source={{ uri: `https://placehold.co/200x200/3525cd/ffffff?text=Asset` }} style={styles.tileImage} />
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(asset.id)}
                    >
                      <MaterialIcons name="close" size={14} color={Colors.onPrimary} />
                    </TouchableOpacity>
                  </View>
                ))}
                {showAddTile && (
                  <TouchableOpacity
                    style={styles.addTile}
                    activeOpacity={0.8}
                    onPress={() => handlePick(sec.type, sec.multiple)}
                    disabled={uploadingType !== null}
                  >
                    {uploadingType === sec.type ? (
                      <ActivityIndicator color={Colors.primary} />
                    ) : (
                      <>
                        <MaterialIcons name="add-photo-alternate" size={26} color={Colors.primary} />
                        <Text style={styles.addText}>
                          {sec.multiple && items.length > 0 ? 'Add More' : 'Upload'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        <View style={styles.tipCard}>
          <MaterialIcons name="lightbulb" size={18} color={Colors.secondary} />
          <Text style={styles.tipText}>
            More variety = better playbook. Mix logos, lifestyle shots, product photos, and previous ads.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label="Analyze My Brand"
          onPress={handleContinue}
          disabled={!canContinue || uploadingType !== null}
        />
        {!canContinue && (
          <Text style={styles.footerHelp}>
            {!logoOk ? 'Upload a logo to continue.' : 'Add at least 3 brand images to continue.'}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.gutter, gap: Spacing.md, paddingBottom: Spacing.xl },
  title: { ...Typography.headlineMd, color: Colors.onSurface },
  subtitle: { ...Typography.bodyBase, color: Colors.onSurfaceVariant, marginBottom: Spacing.sm },
  section: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sectionLabel: { ...Typography.titleMd, color: Colors.onSurface },
  sectionHelper: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, marginTop: 2 },
  counter: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
  },
  counterOk: { backgroundColor: Colors.success + '1A', color: Colors.success },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    width: 76,
    height: 76,
    borderRadius: Radius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.surfaceContainerHigh,
  },
  tileImage: { width: '100%', height: '100%' },
  deleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: {
    width: 76,
    height: 76,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderStyle: 'dashed',
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addText: { ...Typography.labelCaps, color: Colors.primary },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.secondary + '0F',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.secondary + '33',
    padding: Spacing.md,
  },
  tipText: { ...Typography.bodySm, color: Colors.onSurfaceVariant, flex: 1 },
  footer: { padding: Spacing.gutter, gap: 6 },
  footerHelp: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, textAlign: 'center' },
});
