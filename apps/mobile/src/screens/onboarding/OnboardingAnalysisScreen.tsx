import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated, Easing, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BrandColor } from '@megadon/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import OnboardingProgress from '../../components/OnboardingProgress';
import PrimaryButton from '../../components/PrimaryButton';
import AppHeader from '../../components/AppHeader';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorView from '../../components/ErrorView';
import { RootStackParamList } from '../../navigation';
import { useOnboarding } from '../../lib/OnboardingContext';
import { api } from '../../lib/api';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ANALYSIS_STEPS = [
  'Analyzing colors...',
  'Analyzing visual style...',
  'Analyzing messaging...',
  'Building brand playbook...',
];

function AnalyzingView() {
  const [step, setStep] = useState(0);
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true }),
    ).start();
    const t = setInterval(() => setStep((s) => Math.min(s + 1, ANALYSIS_STEPS.length - 1)), 2500);
    return () => clearInterval(t);
  }, [rotation]);

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.analyzingWrap}>
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

      <Text style={styles.analyzingTitle}>Building your brand playbook</Text>
      <Text style={styles.analyzingSub}>
        We're studying your assets and crafting a tailored intelligence playbook.
      </Text>

      <View style={styles.stepsCol}>
        {ANALYSIS_STEPS.map((s, i) => (
          <View key={i} style={styles.stepRow}>
            {i < step ? (
              <MaterialIcons name="check-circle" size={18} color={Colors.success} />
            ) : i === step ? (
              <MaterialIcons name="radio-button-checked" size={18} color={Colors.primary} />
            ) : (
              <MaterialIcons name="radio-button-unchecked" size={18} color={Colors.outlineVariant} />
            )}
            <Text style={[styles.stepText, i === step && styles.stepActive, i < step && styles.stepDone]}>
              {s}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ConfidenceChip({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 75 ? Colors.success : pct >= 50 ? Colors.warning : Colors.error;
  return (
    <View style={[styles.confChip, { backgroundColor: color + '1A' }]}>
      <Text style={[styles.confChipText, { color }]}>{pct}%</Text>
    </View>
  );
}

function ColorSwatch({ color }: { color: BrandColor }) {
  return (
    <View style={styles.swatch}>
      <View style={[styles.swatchDot, { backgroundColor: color.hex }]} />
      <Text style={styles.swatchName} numberOfLines={1}>{color.name}</Text>
      <Text style={styles.swatchHex}>{color.hex}</Text>
    </View>
  );
}

export default function OnboardingAnalysisScreen() {
  const navigation = useNavigation<Nav>();
  const { playbook, error, refresh } = useOnboarding();

  const status = playbook?.status;
  const analysis = playbook?.analysis;

  // Kick off analyze if user lands here in 'draft' (e.g. deep-linked back).
  useEffect(() => {
    if (status === 'draft') {
      api.analyzeBrand().catch(() => {});
    }
  }, [status]);

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader showBack onBack={() => navigation.goBack()} />
        <OnboardingProgress step={4} label="AI Brand Analysis" />
        <ErrorView message={error} onRetry={refresh} />
      </SafeAreaView>
    );
  }

  if (!playbook) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader showBack onBack={() => navigation.goBack()} />
        <OnboardingProgress step={4} label="AI Brand Analysis" />
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (status === 'analyzing' || status === 'draft') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader />
        <OnboardingProgress step={4} label="AI Brand Analysis" />
        <AnalyzingView />
      </SafeAreaView>
    );
  }

  if (status === 'failed') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader showBack onBack={() => navigation.goBack()} />
        <OnboardingProgress step={4} label="AI Brand Analysis" />
        <ErrorView
          message={playbook.error?.message ?? 'Analysis failed'}
          onRetry={async () => {
            try {
              await api.analyzeBrand();
              await refresh();
            } catch {}
          }}
        />
      </SafeAreaView>
    );
  }

  // status === 'ready' or 'approved'
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AppHeader showBack onBack={() => navigation.goBack()} />
      <OnboardingProgress step={4} label="Analysis Complete" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.completeBadge}>
          <MaterialIcons name="check-circle" size={16} color={Colors.success} />
          <Text style={styles.completeBadgeText}>Analysis Complete</Text>
        </View>

        <Text style={styles.title}>Your brand playbook is ready</Text>
        <Text style={styles.subtitle}>
          Review the AI's findings below, then continue to make any tweaks.
        </Text>

        {/* Brand colors */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Brand Colors</Text>
            <ConfidenceChip value={analysis?.confidence.colors ?? 0} />
          </View>
          <View style={styles.swatchRow}>
            {(analysis?.colors ?? []).slice(0, 5).map((c, i) => (
              <ColorSwatch key={i} color={c} />
            ))}
            {!analysis?.colors.length && (
              <Text style={styles.empty}>No palette detected.</Text>
            )}
          </View>
        </View>

        {/* Brand personality */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Brand Personality</Text>
            <ConfidenceChip value={analysis?.confidence.personality ?? 0} />
          </View>
          <View style={styles.chipRow}>
            {(analysis?.personality ?? []).map((t, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tone of voice */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Tone of Voice</Text>
            <ConfidenceChip value={analysis?.confidence.toneOfVoice ?? 0} />
          </View>
          <Text style={styles.cardBody}>{analysis?.toneOfVoice || '—'}</Text>
        </View>

        {/* Visual style */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Visual Style</Text>
            <ConfidenceChip value={analysis?.confidence.visualStyle ?? 0} />
          </View>
          <Text style={styles.cardBody}>{analysis?.visualStyle || '—'}</Text>
        </View>

        {/* Target audience */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Target Audience</Text>
            <ConfidenceChip value={analysis?.confidence.audience ?? 0} />
          </View>
          <Text style={styles.cardBody}>{analysis?.targetAudience || '—'}</Text>
        </View>

        {/* Recommended creative styles */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recommended Creative Styles</Text>
          <View style={styles.chipRow}>
            {(analysis?.creativeStyles ?? []).map((s, i) => (
              <View key={i} style={[styles.chip, styles.chipAccent]}>
                <Text style={[styles.chipText, styles.chipTextAccent]}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Brand rules */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Suggested Brand Rules</Text>
          <View style={{ gap: Spacing.sm, marginTop: Spacing.xs }}>
            {(analysis?.brandRules ?? []).map((r, i) => (
              <View key={i} style={styles.ruleRow}>
                <View style={styles.ruleDot} />
                <Text style={styles.ruleText}>{r}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label="Review Brand Playbook"
          onPress={() => navigation.navigate('OnboardingReview')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.gutter, gap: Spacing.md, paddingBottom: Spacing.xl },

  // analyzing
  analyzingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.lg },
  spinnerRing: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  spinnerInner: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center', justifyContent: 'center',
  },
  analyzingTitle: { ...Typography.headlineMd, color: Colors.onSurface, textAlign: 'center' },
  analyzingSub: { ...Typography.bodyBase, color: Colors.onSurfaceVariant, textAlign: 'center' },
  stepsCol: { gap: Spacing.sm, alignSelf: 'stretch', marginTop: Spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepText: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  stepActive: { color: Colors.primary, fontWeight: '600' },
  stepDone: { color: Colors.success },

  // complete view
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.success + '1A',
  },
  completeBadgeText: { ...Typography.labelCaps, color: Colors.success, textTransform: 'uppercase' },
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
  empty: { ...Typography.bodySm, color: Colors.onSurfaceVariant },

  // confidence
  confChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  confChipText: { ...Typography.labelCaps, fontSize: 10, fontWeight: '700' },

  // chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
  },
  chipAccent: { backgroundColor: Colors.primaryFixed },
  chipText: { ...Typography.bodySm, color: Colors.onSurface },
  chipTextAccent: { color: Colors.primary, fontWeight: '600' },

  // color swatches
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  swatch: {
    width: 90,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    padding: 8,
    gap: 4,
  },
  swatchDot: { width: '100%', height: 36, borderRadius: Radius.sm },
  swatchName: { ...Typography.labelCaps, color: Colors.onSurface, fontWeight: '600' },
  swatchHex: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, fontSize: 9 },

  // rules
  ruleRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  ruleDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.primary, marginTop: 7,
  },
  ruleText: { ...Typography.bodySm, color: Colors.onSurfaceVariant, flex: 1 },

  footer: { padding: Spacing.gutter },
});
