import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../theme';

interface Props {
  currentStep: number;
  totalSteps: number;
  stepLabel: string;
}

export default function WizardProgress({ currentStep, totalSteps, stepLabel }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.stepText}>Step {currentStep} of {totalSteps}</Text>
        <Text style={styles.stepLabel}>{stepLabel}</Text>
      </View>
      <View style={styles.track}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              i < currentStep ? styles.filled : styles.empty,
              i < totalSteps - 1 && styles.segmentGap,
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
  track: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    borderRadius: 2,
  },
  segmentGap: {
    marginRight: 3,
  },
  filled: {
    backgroundColor: Colors.primary,
  },
  empty: {
    backgroundColor: Colors.outlineVariant,
  },
});
