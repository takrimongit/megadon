import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../theme';

interface Props {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  highlight?: boolean;
}

export default function StatCard({ label, value, delta, deltaPositive = true, highlight }: Props) {
  return (
    <View style={[styles.card, highlight && styles.highlight]}>
      <Text style={[styles.label, highlight && styles.labelHighlight]}>{label}</Text>
      <View style={styles.row}>
        <Text style={[styles.value, highlight && styles.valueHighlight]}>{value}</Text>
        {delta ? (
          <Text style={[styles.delta, { color: deltaPositive ? Colors.success : Colors.error }]}>
            {delta}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
  },
  highlight: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary + '33',
  },
  label: {
    ...Typography.labelCaps,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  labelHighlight: {
    color: Colors.onPrimaryContainer + 'CC',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  value: {
    ...Typography.headlineMd,
    color: Colors.primary,
  },
  valueHighlight: {
    color: Colors.onPrimaryContainer,
  },
  delta: {
    fontSize: 12,
    fontWeight: '700',
  },
});
