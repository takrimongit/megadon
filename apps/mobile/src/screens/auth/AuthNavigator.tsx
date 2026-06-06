import React, { useState } from 'react';
import SignInScreen from './SignInScreen';
import SignUpScreen from './SignUpScreen';

export default function AuthNavigator() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');

  return mode === 'sign-in' ? (
    <SignInScreen onSwitchToSignUp={() => setMode('sign-up')} />
  ) : (
    <SignUpScreen onSwitchToSignIn={() => setMode('sign-in')} />
  );
}
