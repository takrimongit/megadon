import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Navigation from './src/navigation';
import { initFirebase } from './src/lib/firebase';
import { AuthProvider, useAuth } from './src/lib/AuthContext';
import { WizardProvider } from './src/lib/WizardContext';
import { OnboardingProvider } from './src/lib/OnboardingContext';
import AuthNavigator from './src/screens/auth/AuthNavigator';
import Splash from './src/screens/auth/SplashScreen';
import ErrorView from './src/components/ErrorView';

SplashScreen.preventAutoHideAsync();
initFirebase();

function RootGate() {
  const { status, retry } = useAuth();

  if (status === 'loading') return <Splash />;
  if (status === 'signed-out') return <AuthNavigator />;
  if (status === 'bootstrapping') return <Splash label="Setting up your workspace…" />;
  if (status === 'error') {
    return (
      <View style={{ flex: 1 }}>
        <ErrorView message="Couldn't load your workspace. Check your connection and try again." onRetry={retry} />
      </View>
    );
  }
  return <Navigation />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_500Medium,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <StatusBar style="dark" />
        <AuthProvider>
          <OnboardingProvider>
            <WizardProvider>
              <RootGate />
            </WizardProvider>
          </OnboardingProvider>
        </AuthProvider>
      </View>
    </SafeAreaProvider>
  );
}
