import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '../../theme';

interface Props {
  label?: string;
}

export default function Splash({ label }: Props) {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.center}>
        <LinearGradient
          colors={[Colors.primary, Colors.secondary]}
          style={styles.logo}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialIcons name="workspace-premium" size={36} color={Colors.onPrimary} />
        </LinearGradient>
        <Text style={styles.title}>AdForge AI</Text>
        <ActivityIndicator color={Colors.primary} />
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  logo: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...Typography.titleLg, color: Colors.primary },
  label: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
});
