import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../theme';

interface Props {
  message: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export default function ErrorView({ message, onRetry, style }: Props) {
  return (
    <View style={[styles.container, style]}>
      <MaterialIcons name="error-outline" size={36} color={Colors.error} />
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.8}>
          <MaterialIcons name="refresh" size={16} color={Colors.primary} />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  message: {
    ...Typography.bodyBase,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryFixed,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
  },
  retryText: {
    ...Typography.bodySm,
    color: Colors.primary,
    fontWeight: '600',
  },
});
