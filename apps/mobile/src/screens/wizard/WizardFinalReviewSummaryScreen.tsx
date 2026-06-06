import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import PrimaryButton from '../../components/PrimaryButton';
import { RootStackParamList } from '../../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function WizardFinalReviewSummaryScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[Colors.primary, Colors.secondary]} style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="check-circle" size={48} color={Colors.onPrimary} />
          </View>
          <Text style={styles.heroTitle}>Batch Submitted!</Text>
          <Text style={styles.heroSubtitle}>Your brief is queued. AdForge AI will begin generating your 10 ads shortly.</Text>
        </LinearGradient>

        <View style={styles.body}>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>BATCH ID</Text>
              <Text style={styles.infoValue}>#403</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ESTIMATED TIME</Text>
              <Text style={styles.infoValue}>~2–3 min</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ADS TO GENERATE</Text>
              <Text style={styles.infoValue}>10 ads</Text>
            </View>
          </View>

          <View style={styles.nextSteps}>
            <Text style={styles.nextTitle}>What happens next?</Text>
            {[
              'AI generates your ads based on the brief',
              'You review and approve or request revisions',
              'Approved ads are exported for publishing',
              'Performance data feeds back into the next batch',
            ].map((step, i) => (
              <View key={i} style={styles.nextRow}>
                <View style={styles.nextBullet}><Text style={styles.nextBulletText}>{i + 1}</Text></View>
                <Text style={styles.nextText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton label="View Batch Queue" onPress={() => navigation.navigate('MainTabs')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 100 },
  hero: { padding: Spacing.xl, alignItems: 'center', gap: Spacing.md },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { ...Typography.headlineMd, color: Colors.onPrimary, textAlign: 'center' },
  heroSubtitle: { ...Typography.bodyBase, color: Colors.onPrimary + 'CC', textAlign: 'center' },
  body: { padding: Spacing.gutter, gap: Spacing.md },
  infoCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '4D',
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant + '33',
  },
  infoLabel: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, textTransform: 'uppercase' },
  infoValue: { ...Typography.bodySm, color: Colors.onSurface, fontWeight: '700' },
  nextSteps: { gap: Spacing.md },
  nextTitle: { ...Typography.titleMd, color: Colors.onSurface },
  nextRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  nextBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBulletText: { ...Typography.labelCaps, color: Colors.primary, fontWeight: '700' },
  nextText: { ...Typography.bodyBase, color: Colors.onSurfaceVariant, flex: 1 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.gutter, backgroundColor: Colors.background },
});
