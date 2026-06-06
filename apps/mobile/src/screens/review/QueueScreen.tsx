import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import { RootStackParamList } from '../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const queue = [
  { id: '402', name: 'Summer Sale — Instagram Reels', priority: 'High', dueIn: '2h', ads: 12 },
  { id: '403', name: 'New Arrivals — TikTok', priority: 'Medium', dueIn: '5h', ads: 8 },
  { id: '404', name: 'Loyalty Campaign — Facebook', priority: 'Low', dueIn: '1d', ads: 15 },
];

const priorityColors: Record<string, string> = {
  High: Colors.error,
  Medium: Colors.warning,
  Low: Colors.success,
};

export default function QueueScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Review Queue</Text>
          <Text style={styles.subtitle}>{queue.length} batches awaiting review</Text>
        </View>
        {queue.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.queueCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ReviewBatch', { batchId: item.id })}
          >
            <View style={styles.queueLeft}>
              <View style={[styles.priorityDot, { backgroundColor: priorityColors[item.priority] }]} />
              <View>
                <Text style={styles.queueName}>{item.name}</Text>
                <Text style={styles.queueMeta}>{item.ads} ads · Due in {item.dueIn}</Text>
              </View>
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: priorityColors[item.priority] + '1A' }]}>
              <Text style={[styles.priorityText, { color: priorityColors[item.priority] }]}>{item.priority}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.gutter, gap: Spacing.sm, paddingBottom: 32 },
  header: { marginBottom: Spacing.sm },
  title: { ...Typography.headlineMd, color: Colors.onSurface },
  subtitle: { ...Typography.bodyBase, color: Colors.onSurfaceVariant },
  queueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
  },
  queueLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
  queueName: { ...Typography.bodySm, color: Colors.onSurface, fontWeight: '600' },
  queueMeta: { ...Typography.labelCaps, color: Colors.onSurfaceVariant },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  priorityText: { ...Typography.labelCaps, fontSize: 10, fontWeight: '700' },
});
