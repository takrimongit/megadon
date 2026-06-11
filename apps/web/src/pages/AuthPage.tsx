import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { getAuthInstance } from '../lib/firebase';
import { Field } from '../components/Ui';
import { useToast } from '../lib/Toast';

const FRIENDLY: Record<string, string> = {
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/user-not-found': 'No account with that email — try signing up.',
  'auth/email-already-in-use': 'That email already has an account — sign in instead.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-email': 'That email address doesn’t look right.',
  'auth/too-many-requests': 'Too many attempts — wait a minute and try again.',
};

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const auth = getAuthInstance();
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      // AuthContext handles the rest (workspace bootstrap + redirect).
    } catch (err: any) {
      setError(FRIENDLY[err?.code] ?? err?.message ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email above first, then click "Forgot password".');
      return;
    }
    try {
      await sendPasswordResetEmail(getAuthInstance(), email.trim());
      toast('Password reset email sent.', 'success');
    } catch (err: any) {
      setError(FRIENDLY[err?.code] ?? err?.message ?? 'Could not send reset email.');
    }
  };

  return (
    <div className="auth-bg">
      <div className="card auth-card">
        <div className="row" style={{ justifyContent: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 44, height: 44, borderRadius: 12, background: 'var(--grad)',
              display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 20,
            }}
          >
            A
          </div>
          <div>
            <h2 style={{ color: 'var(--primary)' }}>AdForge AI</h2>
            <p className="sub">Self-improving batch ad generation</p>
          </div>
        </div>

        <div className="tabs" style={{ width: '100%', marginBottom: 24 }}>
          <button
            className={`tab ${mode === 'signin' ? 'active' : ''}`}
            style={{ flex: 1 }}
            onClick={() => { setMode('signin'); setError(null); }}
          >
            Sign in
          </button>
          <button
            className={`tab ${mode === 'signup' ? 'active' : ''}`}
            style={{ flex: 1 }}
            onClick={() => { setMode('signup'); setError(null); }}
          >
            Create account
          </button>
        </div>

        <form onSubmit={submit}>
          <Field label="Email">
            <input
              className="input"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field
            label="Password"
            hint={mode === 'signup' ? 'At least 6 characters.' : undefined}
          >
            <input
              className="input"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </Field>

          {error ? (
            <div className="badge badge-error" style={{ display: 'flex', padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
              {error}
            </div>
          ) : null}

          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
            {busy ? 'One moment…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {mode === 'signin' ? (
          <button
            className="btn btn-ghost btn-sm btn-block mt-12"
            style={{ border: 'none' }}
            onClick={resetPassword}
          >
            Forgot password?
          </button>
        ) : null}
      </div>
    </div>
  );
}
