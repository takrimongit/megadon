import { useEffect, useMemo, useState } from 'react';
import type { GeekDefaults, GeekSettings } from '@megadon/types';
import { api } from '../lib/api';
import { useToast } from '../lib/Toast';
import { CenterSpinner, Toggle } from '../components/Ui';
import { estimateLabel, priceFor } from '../lib/pricing';

type ChatKey = 'chat' | 'revise' | 'personas' | 'analyze';
type MediaKey = 'image' | 'video';
type SurfaceKey = ChatKey | MediaKey;

const CHAT_SECTIONS: { key: ChatKey; title: string; icon: string; description: string }[] = [
  { key: 'chat', title: 'Ad Copy Generation', icon: '✍️', description: 'Writes headline, body, hook and CTA for every new ad.' },
  { key: 'revise', title: 'Ad Copy Revisions', icon: '🪄', description: 'Applies reviewer instructions to existing ad copy.' },
  { key: 'personas', title: 'Audience Personas', icon: '👥', description: 'Suggests audience personas in the campaign wizard.' },
  { key: 'analyze', title: 'Brand Analysis', icon: '🎨', description: 'Builds your brand playbook from company info + assets.' },
];

const MEDIA_SECTIONS: { key: MediaKey; title: string; icon: string; description: string }[] = [
  { key: 'image', title: 'Image Creative', icon: '🖼️', description: 'Text-to-image generation for every image ad background.' },
  { key: 'video', title: 'Video Creative', icon: '🎬', description: 'Text-to-video generation (Veo) for video ad batches.' },
];

function isOverridden(s: GeekSettings, key: SurfaceKey): boolean {
  const o = s[key] as { model?: string; systemPrompt?: string; promptTemplate?: string } | undefined;
  return Boolean(o && (o.model?.trim() || o.systemPrompt?.trim() || o.promptTemplate?.trim()));
}

export default function GeekModePage() {
  const toast = useToast();
  const [settings, setSettings] = useState<GeekSettings | null>(null);
  const [saved, setSaved] = useState<string>('');
  const [defaults, setDefaults] = useState<GeekDefaults | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.getGeekSettings(), api.getGeekDefaults()])
      .then(([s, d]) => {
        setSettings(s);
        setSaved(JSON.stringify(s));
        setDefaults(d);
      })
      .catch((e) => toast(e?.message ?? 'Could not load Geek Mode settings', 'error'));
  }, [toast]);

  const dirty = useMemo(
    () => settings !== null && JSON.stringify(settings) !== saved,
    [settings, saved],
  );

  const patch = (key: SurfaceKey, field: string, value: string) => {
    setSettings((s) => {
      if (!s) return s;
      const existing = (s[key] as Record<string, string>) ?? {};
      return { ...s, [key]: { ...existing, [field]: value } } as GeekSettings;
    });
  };

  const resetSurface = (key: SurfaceKey) => {
    setSettings((s) => {
      if (!s) return s;
      const next = { ...s } as Record<string, unknown>;
      delete next[key];
      return next as unknown as GeekSettings;
    });
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      // Send empty objects for cleared surfaces so the server replaces them.
      const next = await api.updateGeekSettings({
        enabled: settings.enabled,
        chat: settings.chat ?? {},
        revise: settings.revise ?? {},
        personas: settings.personas ?? {},
        analyze: settings.analyze ?? {},
        image: settings.image ?? {},
        video: settings.video ?? {},
      });
      setSettings(next);
      setSaved(JSON.stringify(next));
      toast('Geek Mode settings saved ✓', 'success');
    } catch (e: any) {
      toast(e?.message ?? 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard', 'success');
  };

  if (!settings || !defaults) return <div className="page"><CenterSpinner label="Loading Geek Mode…" /></div>;

  const allVars = [
    ...defaults.variables.common,
    ...defaults.variables.brief,
    ...defaults.variables.copy,
    ...defaults.variables.brand,
  ];

  return (
    <div className="page page-narrow" style={{ paddingBottom: dirty ? 96 : 28 }}>
      <h1 className="h-page mb-8">🧠 Geek Mode</h1>
      <p className="sub mb-24">
        Take full control of every AI surface — swap models, rewrite system prompts, and template
        the creative prompts. Platform defaults are shown for each surface so you can copy and
        build on them instead of starting from scratch.
      </p>

      <div className="card row-between mb-24" style={{ borderColor: settings.enabled ? 'var(--primary)' : undefined }}>
        <div>
          <div className="row" style={{ gap: 8 }}>
            <strong>Enable Geek Mode</strong>
            {settings.enabled
              ? <span className="badge badge-primary">Active</span>
              : <span className="badge badge-neutral">Off — defaults in use</span>}
          </div>
          <p className="sub" style={{ fontSize: 12.5 }}>
            When off, every override below is ignored. Your edits are kept, so you can flip this
            on and off safely to A/B against the defaults.
          </p>
        </div>
        <Toggle
          checked={Boolean(settings.enabled)}
          onChange={(v) => setSettings({ ...settings, enabled: v })}
          ariaLabel="Enable Geek Mode"
        />
      </div>

      <details className="expander mb-24">
        <summary>📚 Template variables reference</summary>
        <div className="expander-body">
          <p className="sub mb-8" style={{ fontSize: 12.5 }}>
            Media prompt templates support mustache-style variables, interpolated per-ad at
            generation time. Click any variable to copy it.
          </p>
          <div className="chip-row">
            {allVars.map((v) => (
              <button key={v} className="chip mono-chip" onClick={() => copyText(v)}>{v}</button>
            ))}
          </div>
        </div>
      </details>

      <div className="label-caps mb-8">Text & chat surfaces</div>
      <div className="col mb-24">
        {CHAT_SECTIONS.map((s) => {
          const cur = (settings[s.key] ?? {}) as { model?: string; systemPrompt?: string };
          const def = defaults[s.key];
          const overridden = isOverridden(settings, s.key);
          return (
            <div key={s.key} className="card">
              <div className="row-between mb-8">
                <div className="row">
                  <span style={{ fontSize: 20 }}>{s.icon}</span>
                  <div>
                    <div className="row" style={{ gap: 8 }}>
                      <strong>{s.title}</strong>
                      {overridden && <span className="badge badge-primary">customized</span>}
                    </div>
                    <p className="sub" style={{ fontSize: 12 }}>{s.description}</p>
                  </div>
                </div>
                {overridden && (
                  <button className="btn btn-ghost btn-sm" onClick={() => resetSurface(s.key)}>
                    Reset to default
                  </button>
                )}
              </div>

              <div className="field" style={{ marginBottom: 8 }}><label>Model</label></div>
              <div className="chip-row mb-8">
                {def.models.map((m) => (
                  <button key={m}
                    className={`chip mono-chip ${(cur.model ?? def.defaultModel) === m ? 'active' : ''}`}
                    onClick={() => patch(s.key, 'model', m)}>
                    {m}{m === def.defaultModel ? ' ★' : ''}
                  </button>
                ))}
              </div>
              <input className="input mono" style={{ fontSize: 12.5 }}
                placeholder={`Or any kie.ai model id (default: ${def.defaultModel})`}
                value={cur.model ?? ''}
                onChange={(e) => patch(s.key, 'model', e.target.value)} />
              <div className="sub mono mt-4" style={{ fontSize: 11 }}>
                {estimateLabel(priceFor(defaults.pricing, cur.model, 'call', def.defaultModel))}
              </div>

              <div className="field mt-12" style={{ marginBottom: 8 }}><label>System prompt</label></div>
              <textarea className="textarea mono-area" rows={4}
                placeholder="Leave blank to use the platform default below."
                value={cur.systemPrompt ?? ''}
                onChange={(e) => patch(s.key, 'systemPrompt', e.target.value)} />

              <details className="expander mt-8">
                <summary>View platform default prompt</summary>
                <div className="expander-body">
                  <div className="code-panel">{def.systemPrompt}</div>
                  <div className="row mt-8">
                    <button className="btn btn-ghost btn-sm" onClick={() => copyText(def.systemPrompt)}>📋 Copy</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => patch(s.key, 'systemPrompt', def.systemPrompt)}>
                      ✏️ Use as starting point
                    </button>
                  </div>
                </div>
              </details>
            </div>
          );
        })}
      </div>

      <div className="label-caps mb-8">Media surfaces</div>
      <div className="col">
        {MEDIA_SECTIONS.map((s) => {
          const cur = (settings[s.key] ?? {}) as { model?: string; promptTemplate?: string };
          const def = defaults[s.key];
          const overridden = isOverridden(settings, s.key);
          return (
            <div key={s.key} className="card">
              <div className="row-between mb-8">
                <div className="row">
                  <span style={{ fontSize: 20 }}>{s.icon}</span>
                  <div>
                    <div className="row" style={{ gap: 8 }}>
                      <strong>{s.title}</strong>
                      {overridden && <span className="badge badge-primary">customized</span>}
                    </div>
                    <p className="sub" style={{ fontSize: 12 }}>{s.description}</p>
                  </div>
                </div>
                {overridden && (
                  <button className="btn btn-ghost btn-sm" onClick={() => resetSurface(s.key)}>
                    Reset to default
                  </button>
                )}
              </div>

              <div className="field" style={{ marginBottom: 8 }}><label>Model</label></div>
              <div className="chip-row mb-8">
                {def.models.map((m) => (
                  <button key={m}
                    className={`chip mono-chip ${(cur.model ?? def.defaultModel) === m ? 'active' : ''}`}
                    onClick={() => patch(s.key, 'model', m)}>
                    {m}{m === def.defaultModel ? ' ★' : ''}
                  </button>
                ))}
              </div>
              <input className="input mono" style={{ fontSize: 12.5 }}
                placeholder={`Or any kie.ai model id (default: ${def.defaultModel})`}
                value={cur.model ?? ''}
                onChange={(e) => patch(s.key, 'model', e.target.value)} />
              <div className="sub mono mt-4" style={{ fontSize: 11 }}>
                {estimateLabel(priceFor(defaults.pricing, cur.model, s.key === 'video' ? 'video' : 'image', def.defaultModel))}
              </div>

              <div className="field mt-12" style={{ marginBottom: 8 }}>
                <label>Prompt template</label>
              </div>
              <textarea className="textarea mono-area" rows={6}
                placeholder="Leave blank to use the brand-aware default below. Supports {{variables}}."
                value={cur.promptTemplate ?? ''}
                onChange={(e) => patch(s.key, 'promptTemplate', e.target.value)} />

              <details className="expander mt-8">
                <summary>View platform default template</summary>
                <div className="expander-body">
                  <div className="code-panel">{def.promptTemplate}</div>
                  <div className="row mt-8">
                    <button className="btn btn-ghost btn-sm" onClick={() => copyText(def.promptTemplate)}>📋 Copy</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => patch(s.key, 'promptTemplate', def.promptTemplate)}>
                      ✏️ Use as starting point
                    </button>
                  </div>
                </div>
              </details>
            </div>
          );
        })}
      </div>

      {dirty && (
        <div style={{
          position: 'fixed', bottom: 0, left: 232, right: 0, zIndex: 50,
          background: 'var(--surface-lowest)', borderTop: '1px solid var(--outline-variant)',
          padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 -8px 24px rgba(27,27,33,0.08)',
        }}>
          <span className="sub">You have unsaved Geek Mode changes.</span>
          <div className="row">
            <button className="btn btn-ghost" onClick={() => setSettings(JSON.parse(saved))}>Discard</button>
            <button className="btn btn-primary" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
