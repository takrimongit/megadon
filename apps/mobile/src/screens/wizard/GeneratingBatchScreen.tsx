import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Batch } from '@megadon/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { RootStackParamList } from '../../navigation';
import { getDb } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import ErrorView from '../../components/ErrorView';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'GeneratingBatch'>;

const stages = [
  { threshold: 0, label: 'Analyzing your brief...' },
  { threshold: 0.1, label: 'Building audience profile...' },
  { threshold: 0.25, label: 'Generating creative concepts...' },
  { threshold: 0.5, label: 'Producing ad variations...' },
  { threshold: 0.75, label: 'Applying brand guidelines...' },
  { threshold: 0.95, label: 'Finalizing batch...' },
];

export default function GeneratingBatchScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { workspaceId } = useAuth();
  const { batchId } = route.params;
  const [batch, setBatch] = useState<Batch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rotation = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true }),
    ).start();
  }, [rotation]);

  useEffect(() => {
    if (!workspaceId || !batchId) return;
    const ref = doc(getDb(), `workspaces/${workspaceId}/batches/${batchId}`);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) return;
        const data = { id: snap.id, ...snap.data() } as Batch;
        setBatch(data);
      },
      (e) => setError(e.message),
    );
    return unsub;
  }, [workspaceId, batchId]);

  useEffect(() => {
    if (!batch) return;
    const pct = batch.progress.total > 0 ? batch.progress.completed / batch.progress.total : 0;
    Animated.timing(progress, { toValue: pct, duration: 600, useNativeDriver: false }).start();
    if (batch.status === 'pending_review' || batch.status === 'approved') {
      navigation.replace('WizardFinalReviewSummary', { batchId: batch.id });
    } else if (batch.status === 'failed') {
      setError('The batch failed to generate. Please try again.');
    }
  }, [batch, navigation, progress]);

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const pct = batch && batch.progress.total > 0 ? batch.progress.completed / batch.progress.total : 0;
  const currentStageIndex = stages.findLastIndex((s) => pct >= s.threshold);
  const total = batch?.progress.total ?? 0;
  const completed = batch?.progress.completed ?? 0;

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ErrorView message={error} onRetry={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient colors={[Colors.background, Colors.primaryFixed]} style={styles.gradient}>
        <View style={styles.center}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <LinearGradient
              colors={[Colors.primary, Colors.secondary]}
              style={styles.spinnerRing}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.spinnerInner}>
                <MaterialIcons name="auto-awesome" size={32} color={Colors.primary} />
              </View>
            </LinearGradient>
          </Animated.View>

          <Text style={styles.title}>Generating Your Batch</Text>
          <Text style={styles.subtitle}>
            {total > 0
              ? `AdForge AI is crafting ${total} high-performance ads — ${completed}/${total} ready.`
              : 'AdForge AI is queuing your batch…'}
          </Text>

          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>

          <View style={styles.stepsList}>
            {stages.map((stage, i) => (
              <View key={stage.label} style={styles.stepRow}>
                {i < currentStageIndex ? (
                  <MaterialIcons name="check-circle" size={18} color={Colors.success} />
                ) : i === currentStageIndex ? (
                  <MaterialIcons name="radio-button-checked" size={18} color={Colors.primary} />
                ) : (
                  <MaterialIcons name="radio-button-unchecked" size={18} color={Colors.outlineVariant} />
                )}
                <Text style={[styles.stepText, i < currentStageIndex && styles.stepDone, i === currentStageIndex && styles.stepActive]}>
                  {stage.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.lg },
  spinnerRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...Typography.headlineMd, color: Colors.onSurface, textAlign: 'center' },
  subtitle: { ...Typography.bodyBase, color: Colors.onSurfaceVariant, textAlign: 'center' },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.outlineVariant + '4D',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  stepsList: { width: '100%', gap: Spacing.sm },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepText: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  stepDone: { color: Colors.success, textDecorationLine: 'line-through' },
  stepActive: { color: Colors.primary, fontWeight: '600' },
});
