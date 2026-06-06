import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import PrimaryButton from '../../components/PrimaryButton';
import { RootStackParamList } from '../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ReviewBatch'>;

const mockAds = Array.from({ length: 12 }, (_, i) => ({
  id: `ad-${i + 1}`,
  headline: ['Shop the Summer Drop', 'Limited Time: 30% Off', 'Your Style, Elevated', 'Don\'t Miss Out'][i % 4],
  platform: ['Instagram', 'TikTok', 'Facebook', 'Instagram'][i % 4],
  format: ['Reel', 'Short', 'Feed', 'Story'][i % 4],
  status: i < 3 ? 'Approved' : i < 5 ? 'Rejected' : 'Pending',
  score: Math.floor(70 + Math.random() * 25),
}));

const statusColors: Record<string, string> = {
  Approved: Colors.success,
  Rejected: Colors.error,
  Pending: Colors.onSurfaceVariant,
};

export default function ReviewBatchScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const [adStatuses, setAdStatuses] = useState<Record<string, string>>({});

  const getStatus = (ad: typeof mockAds[0]) => adStatuses[ad.id] ?? ad.status;

  const approve = (id: string) => setAdStatuses((s) => ({ ...s, [id]: 'Approved' }));
  const reject = (id: string) => setAdStatuses((s) => ({ ...s, [id]: 'Rejected' }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader showBack onBack={() => navigation.goBack()} title={`Batch #${route.params.batchId}`} />
      <View style={styles.batchInfo}>
        <Text style={styles.batchTitle}>Summer Sale — Instagram Reels</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{mockAds.length} ads</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>Jun 5</Text>
          <Text style={styles.metaDot}>·</Text>
          <TouchableOpacity onPress={() => navigation.navigate('RapidReview', { batchId: route.params.batchId })}>
            <Text style={styles.rapidLink}>Rapid Review →</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={mockAds}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const status = getStatus(item);
          return (
            <View style={styles.adCard}>
              <TouchableOpacity
                style={styles.adPreview}
                onPress={() => navigation.navigate('AIRevision', { adId: item.id })}
                activeOpacity={0.85}
              >
                <View style={styles.adPlaceholder}>
                  <MaterialIcons name="image" size={32} color={Colors.outlineVariant} />
                  <Text style={styles.adHeadline} numberOfLines={2}>{item.headline}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusColors[status] + '22' }]}>
                  <Text style={[styles.statusPillText, { color: statusColors[status] }]}>{status}</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.adMeta}>
                <Text style={styles.adPlatform}>{item.platform} · {item.format}</Text>
                <View style={styles.adActions}>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => reject(item.id)}>
                    <MaterialIcons name="close" size={16} color={Colors.error} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => approve(item.id)}>
                    <MaterialIcons name="check" size={16} color={Colors.success} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          <View style={styles.footer}>
            <PrimaryButton label="Submit Approvals" onPress={() => navigation.navigate('MainTabs')} />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  batchInfo: { paddingHorizontal: Spacing.gutter, paddingVertical: Spacing.sm },
  batchTitle: { ...Typography.titleMd, color: Colors.onSurface },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  metaText: { ...Typography.labelCaps, color: Colors.onSurfaceVariant },
  metaDot: { ...Typography.labelCaps, color: Colors.outlineVariant },
  rapidLink: { ...Typography.labelCaps, color: Colors.primary },
  grid: { padding: Spacing.gutter, paddingBottom: 100 },
  row: { gap: Spacing.sm, marginBottom: Spacing.sm },
  adCard: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
    overflow: 'hidden',
  },
  adPreview: { position: 'relative' },
  adPlaceholder: {
    height: 160,
    backgroundColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  adHeadline: { ...Typography.bodySm, color: Colors.onSurface, textAlign: 'center', fontWeight: '600' },
  statusPill: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusPillText: { ...Typography.labelCaps, fontSize: 9, fontWeight: '700' },
  adMeta: { padding: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  adPlatform: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, flex: 1 },
  adActions: { flexDirection: 'row', gap: 6 },
  rejectBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.error + '1A',
    alignItems: 'center', justifyContent: 'center',
  },
  approveBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.success + '1A',
    alignItems: 'center', justifyContent: 'center',
  },
  footer: { padding: Spacing.gutter },
});
