import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { getAuthInstance } from '../../lib/firebase';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import PrimaryButton from '../../components/PrimaryButton';

interface Props {
  onSwitchToSignIn: () => void;
}

export default function SignUpScreen({ onSwitchToSignIn }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(getAuthInstance(), email.trim(), password);
      // AuthProvider's onAuthStateChanged effect will bootstrap the
      // "Personal" workspace via api.createWorkspace().
    } catch (e) {
      const msg = e instanceof Error ? e.message.replace(/^Firebase: /, '') : 'Sign up failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    email.length > 3 && password.length >= 6 && confirm.length >= 6 && !loading;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.secondary]}
            style={styles.logo}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcons name="workspace-premium" size={32} color={Colors.onPrimary} />
          </LinearGradient>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            Generate, review, and ship high-performance ads in minutes.
          </Text>

          <View style={styles.form}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={Colors.onSurfaceVariant + '80'}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!loading}
            />

            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor={Colors.onSurfaceVariant + '80'}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!loading}
            />

            <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repeat password"
              placeholderTextColor={Colors.onSurfaceVariant + '80'}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!loading}
            />

            {error ? (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <PrimaryButton
              label="Create account"
              onPress={handleSignUp}
              loading={loading}
              disabled={!canSubmit}
              style={{ marginTop: Spacing.sm }}
            />

            <TouchableOpacity onPress={onSwitchToSignIn} style={styles.switchRow}>
              <Text style={styles.switchText}>
                Already have an account? <Text style={styles.switchLink}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, padding: Spacing.lg, gap: Spacing.md },
  logo: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  title: { ...Typography.displayLg, color: Colors.onSurface },
  subtitle: { ...Typography.bodyBase, color: Colors.onSurfaceVariant },
  form: { gap: Spacing.sm, marginTop: Spacing.md },
  fieldLabel: { ...Typography.labelCaps, color: Colors.onSurfaceVariant, textTransform: 'uppercase' },
  input: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.md,
    ...Typography.bodyBase,
    color: Colors.onSurface,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: Spacing.sm,
    backgroundColor: Colors.errorContainer,
    borderRadius: Radius.md,
  },
  errorText: { ...Typography.bodySm, color: Colors.error, flex: 1 },
  switchRow: { alignItems: 'center', paddingVertical: Spacing.md },
  switchText: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  switchLink: { color: Colors.primary, fontWeight: '700' },
});
