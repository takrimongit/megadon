import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import { RootStackParamList } from '../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const batches = [
  { id: '402', name: 'Summer Sale — Instagram Reels', status: 'Pending Review', ads: 12, platform: 'Instagram', date: 'Jun 5' },
  { id: '401', name: 'Brand Awareness — Facebook', status: 'Approved', ads: 8, platform: 'Facebook', date: 'Jun 3' },
  { id: '400', name: 'Product Launch — TikTok', status: 'Generating', ads: 15, platform: 'TikTok', date: 'Jun 2' },
  { id: '399', name: 'Retargeting — Multi-platform', status: 'Approved', ads: 20, platform: 'Mixed', date: 'May 30' },
  { id: '398', name: 'Seasonal Promo — YouTube', status: 'Archived', ads: 10, platform: 'YouTube', date: 'May 28' },
];

const statusColors: Record<string, string> = {
  'Pending Review': Colors.warning,
  'Approved': Colors.success,
  'Generating': Colors.primary,
  'Archived': Colors.onSurfaceVariant,
};

const filters = ['All', 'Pending Review', 'Approved', 'Generating'];

export default function BatchesScreen() {
  const navigation = useNavigation<Nav>();
  const [filter, setFilter] = useState('All');

  const filtered = filter === 'All' ? batches : batches.filter((b) => b.status === filter);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader rightIcon="add" onRightPress={() => navigation.navigate('WizardGoal')} />
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {filtered.map((batch) => (
          <TouchableOpacity
            key={batch.id}
            style={styles.batchCard}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('ReviewBatch', { batchId: batch.id })}
          >
            <View style={styles.batchTop}>
              <View style={[styles.statusDot, { backgroundColor: statusColors[batch.status] }]} />
              <Text style={styles.batchName} numberOfLines={1}>{batch.name}</Text>
              <MaterialIcons name="chevron-right" size={20} color={Colors.onSurfaceVariant} />
            </View>
            <View style={styles.batchMeta}>
              <View style={styles.metaItem}>
                <MaterialIcons name="layers" size={14} color={Colors.onSurfaceVariant} />
                <Text style={styles.metaText}>{batch.ads} ads</Text>
              </View>
              <View style={styles.metaItem}>
                <MaterialIcons name="devices" size={14} color={Colors.onSurfaceVariant} />
                <Text style={styles.metaText}>{batch.platform}</Text>
              </View>
              <View style={styles.metaItem}>
                <MaterialIcons name="calendar-today" size={14} color={Colors.onSurfaceVariant} />
                <Text style={styles.metaText}>{batch.date}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColors[batch.status] + '1A' }]}>
                <Text style={[styles.statusText, { color: statusColors[batch.status] }]}>{batch.status}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  filterChipActive: { backgroundColor: Colors.primaryFixed, borderColor: Colors.primary },
  filterText: { ...Typography.labelCaps, color: Colors.onSurfaceVariant },
  filterTextActive: { color: Colors.primary, fontWeight: '700' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.gutter, paddingBottom: 32, gap: Spacing.sm },
  batchCard: {
    padding: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
    gap: Spacing.sm,
  },
  batchTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  batchName: { ...Typography.bodySm, color: Colors.onSurface, fontWeight: '600', flex: 1 },
  batchMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...Typography.labelCaps, color: Colors.onSurfaceVariant },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, marginLeft: 'auto' },
  statusText: { ...Typography.labelCaps, fontSize: 10, fontWeight: '700' },
});
