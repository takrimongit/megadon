import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Brief, MediaType, Persona, Platform, WizardOptions } from '@megadon/types';
import { api } from '../lib/api';
import { useToast } from '../lib/Toast';
import { CenterSpinner, Field, Stepper } from '../components/Ui';

const STEPS = ['Goal', 'Audience', 'Offer & platforms', 'Style & review'];
const DRAFT_KEY = 'adforge.campaignDraft.v1';

interface Draft {
  step: number;
  name: string;
  goal: string;
  mediaType: MediaType;
  ageGroups: string[];
  interests: string[];
  personaDescription: string;
  selectedPersona?: Persona;
  offer: string;
  platforms: Platform[];
  batchSize: number;
  creativeStyle: string;
  tones: string[];
}

const EMPTY: Draft = {
  step: 0, name: '', goal: '', mediaType: 'image',
  ageGroups: [], interests: [], personaDescription: '',
  offer: '', platforms: [], batchSize: 6,
  creativeStyle: '', tones: [],
};

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return { ...EMPTY, ...JSON.parse(raw) };
  } catch { /* corrupted draft — start fresh */ }
  return EMPTY;
}

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export default function NewCampaignPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [options, setOptions] = useState<WizardOptions | null>(null);
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [personas, setPersonas] = useState<Persona[] | null>(null);
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.wizardOptions().then(setOptions).catch(() => toast('Could not load wizard options', 'error'));
  }, [toast]);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const step = draft.step;

  const canContinue = useMemo(() => {
    switch (step) {
      case 0: return draft.goal !== '' && draft.name.trim().length > 0;
      case 1: return draft.ageGroups.length > 0 && draft.interests.length > 0;
      case 2: return draft.offer.trim().length >= 5 && draft.platforms.length > 0;
      case 3: return draft.creativeStyle !== '' && draft.tones.length > 0;
      default: return false;
    }
  }, [draft, step]);

  const suggestPersonas = async () => {
    setLoadingPersonas(true);
    try {
      const result = await api.suggestPersonas({
        ageGroups: draft.ageGroups,
        interests: draft.interests,
        personaDescription: draft.personaDescription || undefined,
      });
      setPersonas(result);
    } catch (e: any) {
      toast(e?.message ?? 'Persona suggestion failed', 'error');
    } finally {
      setLoadingPersonas(false);
    }
  };

  const create = async () => {
    setCreating(true);
    try {
      const brief: Brief = {
        goal: draft.goal as Brief['goal'],
        audience: {
          ageGroups: draft.ageGroups,
          interests: draft.interests,
          personaDescription: draft.personaDescription || undefined,
          selectedPersona: draft.selectedPersona,
        },
        offer: draft.offer.trim(),
        platforms: draft.platforms,
        batchSize: draft.batchSize,
        creativeStyle: draft.creativeStyle as Brief['creativeStyle'],
        tones: draft.tones,
        mediaType: draft.mediaType,
      };
      const { batchId } = await api.createBatch({ name: draft.name.trim(), brief });
      localStorage.removeItem(DRAFT_KEY);
      toast('Batch queued — ads are generating now ✨', 'success');
      navigate(`/batches/${batchId}`);
    } catch (e: any) {
      toast(e?.message ?? 'Could not create campaign', 'error');
      setCreating(false);
    }
  };

  if (!options) return <div className="page"><CenterSpinner label="Loading…" /></div>;

  return (
    <div className="page page-narrow">
      <div className="row-between mb-16">
        <h1 className="h-page">New Campaign</h1>
        {draft.name || draft.goal ? (
          <button className="btn btn-ghost btn-sm" onClick={() => { localStorage.removeItem(DRAFT_KEY); setDraft(EMPTY); setPersonas(null); }}>
            Start over
          </button>
        ) : null}
      </div>
      <Stepper steps={STEPS} current={step} />

      {step === 0 && (
        <div className="card">
          <Field label="Campaign name" hint="Internal — your team sees this in the batch list.">
            <input className="input" autoFocus placeholder="Summer Launch — June"
              value={draft.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <div className="field"><label>What's the goal?</label></div>
          <div className="grid grid-2 mb-16">
            {options.goals.map((g) => (
              <button key={g.id} className={`select-card ${draft.goal === g.id ? 'active' : ''}`}
                onClick={() => set({ goal: g.id })}>
                <div className="sc-title"><span>{g.icon}</span>{g.label}</div>
                <div className="sc-desc">{g.desc}</div>
              </button>
            ))}
          </div>
          <div className="field"><label>What should we generate?</label></div>
          <div className="grid grid-2">
            <button className={`select-card ${draft.mediaType === 'image' ? 'active' : ''}`}
              onClick={() => set({ mediaType: 'image' })}>
              <div className="sc-title">🖼️ Image ads</div>
              <div className="sc-desc">Brand-composited stills with your logo + copy. Fast and cheap.</div>
            </button>
            <button className={`select-card ${draft.mediaType === 'video' ? 'active' : ''}`}
              onClick={() => set({ mediaType: 'video' })}>
              <div className="sc-title">🎬 Video ads</div>
              <div className="sc-desc">6-second cinematic clips via Veo. Best for social feeds.</div>
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="card">
          <div className="field"><label>Age groups</label></div>
          <div className="chip-row mb-16">
            {options.ageGroups.map((a) => (
              <button key={a} className={`chip ${draft.ageGroups.includes(a) ? 'active' : ''}`}
                onClick={() => set({ ageGroups: toggle(draft.ageGroups, a) })}>{a}</button>
            ))}
          </div>
          <div className="field"><label>Interests</label></div>
          <div className="chip-row mb-16">
            {options.interests.map((i) => (
              <button key={i} className={`chip ${draft.interests.includes(i) ? 'active' : ''}`}
                onClick={() => set({ interests: toggle(draft.interests, i) })}>{i}</button>
            ))}
          </div>
          <Field label="Describe your ideal customer" hint="Optional — improves AI persona suggestions.">
            <textarea className="textarea" value={draft.personaDescription}
              onChange={(e) => set({ personaDescription: e.target.value })}
              placeholder="Busy product managers at mid-size SaaS companies who…" />
          </Field>

          <div className="row-between mb-8">
            <div className="field" style={{ marginBottom: 0 }}><label>AI-suggested personas</label></div>
            <button className="btn btn-ghost btn-sm" disabled={loadingPersonas || draft.ageGroups.length === 0 || draft.interests.length === 0}
              onClick={suggestPersonas}>
              {loadingPersonas ? 'Thinking…' : personas ? '↻ Regenerate' : '✨ Suggest personas'}
            </button>
          </div>
          {personas && (
            <div className="grid grid-3">
              {personas.map((p) => (
                <button key={p.id}
                  className={`select-card ${draft.selectedPersona?.id === p.id ? 'active' : ''}`}
                  onClick={() => set({ selectedPersona: draft.selectedPersona?.id === p.id ? undefined : p })}>
                  <div className="sc-title">{p.name}</div>
                  <div className="sc-desc">{p.desc}</div>
                  <div className="mono sub mt-8" style={{ fontSize: 10.5 }}>reach ~{p.reach}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <Field label="What are you promoting?" hint="The offer, product, or message. Be concrete — this drives the copy and the visuals.">
            <textarea className="textarea" autoFocus value={draft.offer}
              onChange={(e) => set({ offer: e.target.value })}
              placeholder="20% off annual plans for new customers through June 30" />
          </Field>
          <div className="field"><label>Platforms</label></div>
          <div className="grid grid-3 mb-16">
            {options.platforms.map((p) => (
              <button key={p.id} className={`select-card ${draft.platforms.includes(p.id) ? 'active' : ''}`}
                onClick={() => set({ platforms: toggle(draft.platforms, p.id) })}>
                <div className="sc-title">{p.icon} {p.label}</div>
                <div className="sc-desc">{p.formats}</div>
              </button>
            ))}
          </div>
          <Field label={`Batch size — ${draft.batchSize} ads`} hint="Total ads across all selected platforms.">
            <input type="range" min={2} max={20} value={draft.batchSize}
              onChange={(e) => set({ batchSize: Number(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--primary)' }} />
          </Field>
        </div>
      )}

      {step === 3 && (
        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <div className="field"><label>Visual style</label></div>
            <div className="grid grid-4 mb-16">
              {options.visualStyles.map((v) => (
                <button key={v.id} className={`select-card ${draft.creativeStyle === v.id ? 'active' : ''}`}
                  onClick={() => set({ creativeStyle: v.id })}>
                  <div className="sc-title">{v.label}</div>
                  <div className="sc-desc">{v.desc}</div>
                </button>
              ))}
            </div>
            <div className="field"><label>Tone of voice</label></div>
            <div className="chip-row">
              {options.tones.map((t) => (
                <button key={t} className={`chip ${draft.tones.includes(t) ? 'active' : ''}`}
                  onClick={() => set({ tones: toggle(draft.tones, t) })}>{t}</button>
              ))}
            </div>
          </div>

          <div className="card" style={{ background: 'var(--surface-low)' }}>
            <div className="label-caps mb-8">Review</div>
            <div className="grid grid-2" style={{ gap: 8 }}>
              <div><span className="sub">Campaign:</span> <strong>{draft.name}</strong></div>
              <div><span className="sub">Goal:</span> <strong>{draft.goal}</strong></div>
              <div><span className="sub">Media:</span> <strong>{draft.mediaType === 'video' ? '🎬 Video' : '🖼️ Image'}</strong></div>
              <div><span className="sub">Platforms:</span> <strong>{draft.platforms.join(', ')}</strong></div>
              <div><span className="sub">Batch size:</span> <strong>{draft.batchSize} ads</strong></div>
              <div><span className="sub">Audience:</span> <strong>{draft.selectedPersona?.name ?? draft.interests.slice(0, 3).join(', ')}</strong></div>
            </div>
          </div>
        </div>
      )}

      <div className="row mt-24">
        {step > 0 && (
          <button className="btn btn-ghost" onClick={() => set({ step: step - 1 })}>← Back</button>
        )}
        {step < STEPS.length - 1 ? (
          <button className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={!canContinue}
            onClick={() => set({ step: step + 1 })}>
            Continue →
          </button>
        ) : (
          <button className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={!canContinue || creating}
            onClick={create}>
            {creating ? 'Queueing your batch…' : `🚀 Generate ${draft.batchSize} ${draft.mediaType} ads`}
          </button>
        )}
      </div>
    </div>
  );
}
