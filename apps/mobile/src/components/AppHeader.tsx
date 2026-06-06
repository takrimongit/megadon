import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../theme';

interface Props {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  onRightPress?: () => void;
  onSignOut?: () => void;
}

export default function AppHeader({ title, showBack, onBack, rightIcon, onRightPress, onSignOut }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        {showBack ? (
          <TouchableOpacity onPress={onBack} style={styles.iconBtn} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.onSurface} />
          </TouchableOpacity>
        ) : (
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <MaterialIcons name="workspace-premium" size={18} color={Colors.onPrimary} />
            </View>
            <Text style={styles.logoText}>AdForge AI</Text>
          </View>
        )}

        {title ? <Text style={styles.title}>{title}</Text> : null}

        <View style={styles.rightGroup}>
          {rightIcon ? (
            <TouchableOpacity onPress={onRightPress} style={styles.iconBtn} activeOpacity={0.7}>
              <MaterialIcons name={rightIcon} size={24} color={Colors.primary} />
            </TouchableOpacity>
          ) : null}
          {onSignOut ? (
            <TouchableOpacity onPress={onSignOut} style={styles.iconBtn} activeOpacity={0.7} accessibilityLabel="Sign out">
              <MaterialIcons name="logout" size={22} color={Colors.primary} />
            </TouchableOpacity>
          ) : null}
          {!rightIcon && !onSignOut ? (
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
              <MaterialIcons name="search" size={24} color={Colors.primary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface + 'CC',
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant + '4D',
  },
  inner: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.gutter,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    ...Typography.titleLg,
    color: Colors.primary,
  },
  title: {
    ...Typography.titleMd,
    color: Colors.onSurface,
    flex: 1,
    textAlign: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
