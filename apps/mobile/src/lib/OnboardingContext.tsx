import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import type { BrandPlaybook } from '@megadon/types';
import { api } from './api';
import { getDb, getWorkspaceId } from './firebase';
import { useAuth } from './AuthContext';

type Ctx = {
  playbook: BrandPlaybook | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const OnboardingContext = createContext<Ctx>({
  playbook: null,
  loading: true,
  error: null,
  refresh: async () => {},
});

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { workspaceId } = useAuth();
  const [playbook, setPlaybook] = useState<BrandPlaybook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialFetched = useRef(false);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const pb = await api.getBrandPlaybook();
      setPlaybook(pb);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load brand playbook');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial REST call to ensure the doc exists, then switch to listener.
  useEffect(() => {
    if (!workspaceId) return;
    if (!initialFetched.current) {
      initialFetched.current = true;
      refresh();
    }
  }, [workspaceId, refresh]);

  // Live updates via Firestore.
  useEffect(() => {
    const wid = workspaceId ?? getWorkspaceId();
    if (!wid) return;
    const unsub = onSnapshot(
      doc(getDb(), `workspaces/${wid}/brandPlaybook/current`),
      (snap) => {
        if (snap.exists()) {
          setPlaybook(snap.data() as BrandPlaybook);
          setLoading(false);
        }
      },
      (e) => setError(e.message),
    );
    return unsub;
  }, [workspaceId]);

  const value = useMemo(() => ({ playbook, loading, error, refresh }), [playbook, loading, error, refresh]);
  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): Ctx {
  return useContext(OnboardingContext);
}
