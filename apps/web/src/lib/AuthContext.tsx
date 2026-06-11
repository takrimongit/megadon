import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import type { BrandPlaybook } from '@megadon/types';
import { getAuthInstance, setWorkspaceId, getWorkspaceId } from './firebase';
import { api } from './api';

type AuthStatus = 'loading' | 'signed-out' | 'bootstrapping' | 'ready' | 'error';

interface AuthContextValue {
  user: User | null;
  workspaceId: string | null;
  status: AuthStatus;
  error: string | null;
  playbook: BrandPlaybook | null;
  refreshPlaybook: () => Promise<void>;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspaceId, setWid] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [playbook, setPlaybook] = useState<BrandPlaybook | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    const auth = getAuthInstance();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setWorkspaceId(null);
        setWid(null);
        setPlaybook(null);
        setStatus('signed-out');
        setError(null);
      }
    });
    return unsub;
  }, []);

  // Bootstrap workspace + brand playbook when a user appears.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setStatus('bootstrapping');
    setError(null);
    (async () => {
      try {
        const existing = await api.listWorkspaces();
        let wid: string;
        if (existing.length === 0) {
          const created = await api.createWorkspace('Personal');
          wid = created.id;
        } else {
          wid = existing[0].id;
        }
        if (cancelled) return;
        setWorkspaceId(wid);
        setWid(wid);
        const pb = await api.getBrandPlaybook();
        if (cancelled) return;
        setPlaybook(pb);
        setStatus('ready');
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load workspace');
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, retryToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      workspaceId: workspaceId ?? getWorkspaceId(),
      status,
      error,
      playbook,
      refreshPlaybook: async () => {
        const pb = await api.getBrandPlaybook();
        setPlaybook(pb);
      },
      retry: () => setRetryToken((t) => t + 1),
    }),
    [user, workspaceId, status, error, playbook],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
