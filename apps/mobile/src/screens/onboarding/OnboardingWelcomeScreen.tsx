import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import OnboardingProgress from '../../components/OnboardingProgress';
import PrimaryButton from '../../components/PrimaryButton';
import { RootStackParamList } from '../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PROCESS = [
  { icon: 'collections', text: 'Provide logos and current brand images.' },
  { icon: 'palette', text: 'AI extracts colors, fonts, and core style.' },
  { icon: 'verified', text: 'Confirm your brand\'s AI persona and tone.' },
  { icon: 'rocket-launch', text: 'Start generating high-performing ads.' },
];

export default function OnboardingWelcomeScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <OnboardingProgress step={1} label="Welcome" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero illustration */}
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={[Colors.primary, Colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroBadge}>
              <MaterialIcons name="auto-awesome" size={20} color={Colors.onPrimary} />
              <Text style={styles.heroBadgeText}>BRAND ONBOARDING</Text>
            </View>
            <MaterialIcons name="psychology" size={64} color={Colors.onPrimary} />
          </LinearGradient>
        </View>

        <Text style={styles.title}>Let's teach AI about your brand</Text>
        <Text style={styles.subtitle}>
          Upload a few brand assets and we'll automatically generate a brand playbook that will be used for all future ad creation.
        </Text>

        <View style={styles.processCard}>
          <Text style={styles.processTitle}>Process Preview</Text>
          {PROCESS.map((p, i) => (
            <View key={i} style={styles.processRow}>
              <View style={styles.processIcon}>
                <MaterialIcons name={p.icon as any} size={18} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.processStep}>Step {i + 1}</Text>
                <Text style={styles.processText}>{p.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton label="Get Started" onPress={() => navigation.navigate('OnboardingBrandInfo')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.gutter, paddingBottom: Spacing.lg, gap: Spacing.md },
  heroWrap: { marginTop: Spacing.sm },
  hero: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    minHeight: 180,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroBadgeText: { ...Typography.labelCaps, color: Colors.onPrimary, textTransform: 'uppercase' },
  title: { ...Typography.headlineMd, color: Colors.onSurface, marginTop: Spacing.md },
  subtitle: { ...Typography.bodyBase, color: Colors.onSurfaceVariant },
  processCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  processTitle: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, textTransform: 'uppercase' },
  processRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  processIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.DEFAULT,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processStep: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, textTransform: 'uppercase' },
  processText: { ...Typography.bodySm, color: Colors.onSurface, fontWeight: '500' },
  footer: { padding: Spacing.gutter },
});
