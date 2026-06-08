import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../theme';

interface Props {
  step: number;       // 1-indexed
  total?: number;
  label: string;
}

export default function OnboardingProgress({ step, total = 5, label }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.stepText}>Step {step} of {total}</Text>
        <Text style={styles.stepLabel}>{label}</Text>
      </View>
      <View style={styles.track}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              i < step ? styles.filled : styles.empty,
              i < total - 1 && styles.gap,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.gutter,
    paddingVertical: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  stepText: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  stepLabel: {
    ...Typography.bodySm,
    color: Colors.primary,
    fontWeight: '600',
  },
  track: { flexDirection: 'row', height: 4, borderRadius: 2 },
  segment: { flex: 1, borderRadius: 2 },
  gap: { marginRight: 3 },
  filled: { backgroundColor: Colors.primary },
  empty: { backgroundColor: Colors.outlineVariant },
});
