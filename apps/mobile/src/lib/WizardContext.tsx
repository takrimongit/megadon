import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type {
  CampaignGoal,
  MediaType,
  Persona,
  Platform,
  VideoStyle,
  VisualStyle,
  WizardOptions,
} from '@megadon/types';

export interface WizardState {
  goal: CampaignGoal | null;
  ageGroups: string[];
  interests: string[];
  personaDescription: string;
  selectedPersona: Persona | null;
  offer: string;
  platforms: Platform[];
  batchSize: number;
  creativeStyle: VisualStyle | null;
  tones: string[];
  mediaType: MediaType;
  videoStyle: VideoStyle;
  options: WizardOptions | null;
}

const initialState: WizardState = {
  goal: null,
  ageGroups: [],
  interests: [],
  personaDescription: '',
  selectedPersona: null,
  offer: '',
  platforms: [],
  batchSize: 10,
  creativeStyle: null,
  tones: [],
  mediaType: 'image',
  videoStyle: 'scenic',
  options: null,
};

interface WizardContextValue {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
  reset: () => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WizardState>(initialState);

  const update = useCallback((patch: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setState(initialState), []);

  const value = useMemo(() => ({ state, update, reset }), [state, update, reset]);

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard must be used inside <WizardProvider>');
  return ctx;
}
