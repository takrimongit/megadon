import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import AppHeader from '../../components/AppHeader';
import PrimaryButton from '../../components/PrimaryButton';
import { RootStackParamList } from '../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'BatchGenerating'>;

const logLines = [
  'Initializing generative engine...',
  '>> Synthesizing campaign hooks...',
  '>> Optimizing visual lighting...',
  '>> Balancing contrast levels...',
  '>> Iterating on color harmony for variant #8...',
  '>> Rendering final variant #12...',
  '>> Applying brand guidelines...',
  '>> Generating copy variations...',
];

const TOTAL = 50;

export default function BatchGeneratingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const [progress, setProgress] = useState(23);
  const [completed, setCompleted] = useState(11);
  const [logIndex, setLogIndex] = useState(logLines.length);
  const arcAnim = useRef(new Animated.Value(23)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(p + Math.random() * 3, 100);
        Animated.timing(arcAnim, { toValue: next, duration: 1000, useNativeDriver: false, easing: Easing.out(Easing.quad) }).start();
        return next;
      });
      setCompleted((c) => Math.min(c + 1, TOTAL));
      setLogIndex((i) => (i < logLines.length ? i + 1 : i));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const displayProgress = Math.round(progress);

  // Arc SVG-like indicator using border trick
  const arcRotation = arcAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader showBack onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Batch badge */}
        <View style={styles.batchBadge}>
          <Text style={styles.batchBadgeText}>ACTIVE BATCH: #{route.params.batchId}</Text>
        </View>

        <Text style={styles.title}>Generating {TOTAL} Unique Variants</Text>
        <Text style={styles.subtitle}>Our AI is synthesizing visual hooks and market-specific layouts.</Text>

        {/* Circular progress */}
        <View style={styles.circleContainer}>
          <View style={styles.circleTrack}>
            <Animated.View
              style={[
                styles.circleProgress,
                { transform: [{ rotate: arcRotation }] },
              ]}
            />
            <View style={styles.circleInner}>
              <Text style={styles.percentValue}>{displayProgress}%</Text>
              <Text style={styles.percentLabel}>COMPLETE</Text>
            </View>
          </View>
        </View>

        {/* Metadata */}
        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>VARIANT TYPE</Text>
            <Text style={styles.metaValue}>SaaS Product</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>STYLE</Text>
            <Text style={styles.metaValue}>Bold & Energetic</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>DIMENSIONS</Text>
            <Text style={styles.metaValue}>1080 × 1080</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>EST. TIME</Text>
            <Text style={styles.metaValue}>~{Math.max(1, Math.round((100 - progress) / 4))} min</Text>
          </View>
        </View>

        {/* Actions */}
        <PrimaryButton label="View Drafts" onPress={() => navigation.navigate('ReviewBatch', { batchId: route.params.batchId })} />
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel Generation</Text>
        </TouchableOpacity>

        {/* AI Reasoning Log */}
        <View style={styles.logCard}>
          <View style={styles.logHeader}>
            <View style={styles.logTitleRow}>
              <MaterialIcons name="terminal" size={14} color={Colors.secondary} />
              <Text style={styles.logTitle}>AI REASONING LOG</Text>
            </View>
            <View style={styles.liveDot} />
          </View>
          {logLines.slice(0, logIndex).map((line, i) => (
            <Text key={i} style={[styles.logLine, line.startsWith('>>') ? styles.logLineCmd : styles.logLineSystem]}>
              {line}
            </Text>
          ))}
        </View>

        {/* Live Preview Stream */}
        <View style={styles.previewSection}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>LIVE PREVIEW STREAM</Text>
            <Text style={styles.previewCount}>{completed}/{TOTAL}</Text>
          </View>
          <View style={styles.previewGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={[styles.previewTile, i < completed % 6 + 1 && styles.previewTileReady]}>
                {i < completed % 6 + 1 ? (
                  <MaterialIcons name="image" size={24} color={Colors.outlineVariant} />
                ) : (
                  <MaterialIcons name="hourglass-empty" size={20} color={Colors.outlineVariant + '66'} />
                )}
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.gutter, gap: Spacing.md, paddingBottom: 40 },

  batchBadge: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryFixed,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
  },
  batchBadgeText: { ...Typography.labelCaps, color: Colors.primary, textTransform: 'uppercase' },

  title: { ...Typography.headlineMd, color: Colors.onSurface, textAlign: 'center' },
  subtitle: { ...Typography.bodyBase, color: Colors.onSurfaceVariant, textAlign: 'center', marginTop: -Spacing.sm },

  circleContainer: { alignItems: 'center', paddingVertical: Spacing.md },
  circleTrack: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 12,
    borderColor: Colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circleProgress: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 12,
    borderColor: 'transparent',
    borderTopColor: Colors.primary,
    borderRightColor: Colors.primary,
  },
  circleInner: { alignItems: 'center' },
  percentValue: { ...Typography.displayLg, color: Colors.primary },
  percentLabel: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, textTransform: 'uppercase' },

  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
    backgroundColor: Colors.outlineVariant + '33',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
    overflow: 'hidden',
  },
  metaItem: {
    width: '50%',
    padding: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  metaLabel: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, textTransform: 'uppercase', marginBottom: 4 },
  metaValue: { ...Typography.titleMd, color: Colors.onSurface },

  cancelBtn: {
    paddingVertical: 14,
    borderRadius: Radius.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
  },
  cancelText: { ...Typography.titleMd, color: Colors.onSurface },

  logCard: {
    backgroundColor: Colors.inverseSurface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 6,
  },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  logTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logTitle: { ...Typography.labelCaps, color: Colors.secondary, textTransform: 'uppercase' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  logLine: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 12, lineHeight: 18 },
  logLineSystem: { color: Colors.secondary },
  logLineCmd: { color: Colors.inverseOnSurface + 'CC' },

  previewSection: { gap: Spacing.sm },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewTitle: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, textTransform: 'uppercase' },
  previewCount: { ...Typography.labelCaps, color: Colors.primary, fontWeight: '700' },
  previewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  previewTile: {
    width: '30.5%',
    aspectRatio: 1,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
  },
  previewTileReady: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderColor: Colors.outlineVariant,
  },
});
