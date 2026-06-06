import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { RootStackParamList } from '../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const steps = [
  'Analyzing your brief...',
  'Building audience profile...',
  'Generating creative concepts...',
  'Producing ad variations...',
  'Applying brand guidelines...',
  'Finalizing batch...',
];

export default function GeneratingBatchScreen() {
  const navigation = useNavigation<Nav>();
  const [currentStep, setCurrentStep] = useState(0);
  const rotation = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    const stepInterval = setInterval(() => {
      setCurrentStep((s) => {
        if (s >= steps.length - 1) {
          clearInterval(stepInterval);
          setTimeout(() => navigation.replace('ReviewBatch', { batchId: '403' }), 800);
          return s;
        }
        return s + 1;
      });
    }, 1800);

    Animated.timing(progress, {
      toValue: 1,
      duration: steps.length * 1800,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    return () => clearInterval(stepInterval);
  }, []);

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

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
          <Text style={styles.subtitle}>AdForge AI is crafting 10 high-performance ads tailored to your brief.</Text>

          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>

          <View style={styles.stepsList}>
            {steps.map((step, i) => (
              <View key={step} style={styles.stepRow}>
                {i < currentStep ? (
                  <MaterialIcons name="check-circle" size={18} color={Colors.success} />
                ) : i === currentStep ? (
                  <MaterialIcons name="radio-button-checked" size={18} color={Colors.primary} />
                ) : (
                  <MaterialIcons name="radio-button-unchecked" size={18} color={Colors.outlineVariant} />
                )}
                <Text style={[styles.stepText, i < currentStep && styles.stepDone, i === currentStep && styles.stepActive]}>
                  {step}
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
