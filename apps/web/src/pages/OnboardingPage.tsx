import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BrandAssetType, BrandInfo, BrandPlaybook } from '@megadon/types';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { useToast } from '../lib/Toast';
import { CenterSpinner, Field, Stepper } from '../components/Ui';
import { useBrandAssetUrl } from '../lib/useSignedUrl';

const STEPS = ['Brand info', 'Assets', 'AI analysis', 'Review & approve'];

const INDUSTRIES = [
  'Technology & Software', 'E-commerce & Retail', 'Health & Wellness',
  'Finance & Insurance', 'Food & Beverage', 'Travel & Hospitality',
  'Education', 'Real Estate', 'Entertainment & Media', 'Other',
];

const ASSET_TYPES: { id: BrandAssetType; label: string; desc: string; icon: string }[] = [
  { id: 'logo', label: 'Brand logo', desc: 'PNG/SVG with transparency works best', icon: '🏷️' },
  { id: 'product', label: 'Product shots', desc: 'Hero images of what you sell', icon: '📦' },
  { id: 'previous_ad', label: 'Past ads', desc: 'Creatives that performed well', icon: '🖼️' },
  { id: 'guideline', label: 'Brand guidelines', desc: 'PDF brand book if you have one', icon: '📕' },
];

function AssetThumb({ assetId, filename, onDelete }: { assetId: string; filename?: string; onDelete: () => void }) {
  const url = useBrandAssetUrl(assetId);
  return (
    <div className="card" style={{ padding: 8, width: 120 }}>
      <div style={{ width: '100%', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', background: 'var(--surface-low)' }}>
        {url ? <img src={url} alt={filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div className="center-fill" style={{ minHeight: 0, height: '100%' }}><div className="spinner" /></div>}
      </div>
      <div className="row-between mt-4">
        <span className="sub" style={{ fontSize: 10.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{filename ?? 'asset'}</span>
        <button className="btn btn-sm" style={{ padding: '0 6px', background: 'none', color: 'var(--error)' }} onClick={onDelete}>✕</button>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const { playbook, refreshPlaybook } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // Derive the step from playbook status so refreshes resume correctly.
  const initialStep =
    playbook?.status === 'ready' ? 3 :
    playbook?.status === 'analyzing' ? 2 :
    playbook?.status === 'draft' ? 1 : 0;
  const [step, setStep] = useState(initialStep);
  const [busy, setBusy] = useState(false);

  // ---- Step 0: info ----
  const [info, setInfo] = useState<BrandInfo>({
    companyName: playbook?.info?.companyName ?? '',
    websiteUrl: playbook?.info?.websiteUrl ?? '',
    industry: playbook?.info?.industry ?? '',
    description: playbook?.info?.description ?? '',
  });

  const saveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.updateBrandInfo({
        ...info,
        websiteUrl: info.websiteUrl?.trim() || undefined,
      });
      await refreshPlaybook();
      setStep(1);
    } catch (err: any) {
      toast(err?.message ?? 'Could not save brand info', 'error');
    } finally {
      setBusy(false);
    }
  };

  // ---- Step 1: assets ----
  const [uploading, setUploading] = useState<BrandAssetType | null>(null);
  const fileInputs = useRef<Partial<Record<BrandAssetType, HTMLInputElement | null>>>({});

  const upload = useCallback(async (type: BrandAssetType, file: File) => {
    setUploading(type);
    try {
      const { url, assetPath } = await api.requestBrandUploadUrl(type, file.type, file.name);
      const put = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      await api.registerBrandAsset({ type, path: assetPath, mimeType: file.type, filename: file.name });
      await refreshPlaybook();
      toast(`${file.name} uploaded`, 'success');
    } catch (err: any) {
      toast(err?.message ?? 'Upload failed', 'error');
    } finally {
      setUploading(null);
    }
  }, [refreshPlaybook, toast]);

  const removeAsset = async (assetId: string) => {
    try {
      await api.deleteBrandAsset(assetId);
      await refreshPlaybook();
    } catch (err: any) {
      toast(err?.message ?? 'Could not delete asset', 'error');
    }
  };

  const startAnalysis = async () => {
    setBusy(true);
    try {
      await api.analyzeBrand();
      await refreshPlaybook();
      setStep(2);
    } catch (err: any) {
      toast(err?.message ?? 'Could not start analysis', 'error');
    } finally {
      setBusy(false);
    }
  };

  // ---- Step 2: poll while analyzing ----
  useEffect(() => {
    if (step !== 2) return;
    const t = setInterval(async () => {
      const pb = await api.getBrandPlaybook();
      if (pb.status === 'ready') {
        await refreshPlaybook();
        setStep(3);
      } else if (pb.status === 'failed') {
        await refreshPlaybook();
        toast(pb.error?.message ?? 'Analysis failed — you can retry.', 'error');
        setStep(1);
      }
    }, 3000);
    return () => clearInterval(t);
  }, [step, refreshPlaybook, toast]);

  // ---- Step 3: approve ----
  const approve = async () => {
    setBusy(true);
    try {
      await api.approveBrandPlaybook();
      await refreshPlaybook();
      toast('Brand playbook approved — let’s make some ads!', 'success');
      navigate('/');
    } catch (err: any) {
      toast(err?.message ?? 'Could not approve playbook', 'error');
    } finally {
      setBusy(false);
    }
  };

  const a = playbook?.analysis;

  return (
    <div className="auth-bg" style={{ alignItems: 'flex-start', paddingTop: 48 }}>
      <div style={{ width: '100%', maxWidth: 760 }}>
        <div className="row" style={{ justifyContent: 'center', marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--grad)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800 }}>A</div>
          <h2 style={{ color: 'var(--primary)' }}>Build your Brand Profile</h2>
        </div>
        <p className="sub mb-24" style={{ textAlign: 'center' }}>
          One-time setup. Every ad we generate uses this playbook to stay on-brand.
        </p>

        <div className="card" style={{ padding: 28 }}>
          <Stepper steps={STEPS} current={step} />

          {step === 0 && (
            <form onSubmit={saveInfo}>
              <Field label="Company name">
                <input className="input" required value={info.companyName}
                  onChange={(e) => setInfo({ ...info, companyName: e.target.value })}
                  placeholder="Acme Inc." />
              </Field>
              <Field label="Website" hint="Optional — helps the AI understand your brand.">
                <input className="input" type="url" value={info.websiteUrl ?? ''}
                  onChange={(e) => setInfo({ ...info, websiteUrl: e.target.value })}
                  placeholder="https://acme.com" />
              </Field>
              <Field label="Industry">
                <select className="input" required value={info.industry}
                  onChange={(e) => setInfo({ ...info, industry: e.target.value })}>
                  <option value="" disabled>Select your industry…</option>
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </Field>
              <Field label="What do you do?" hint="2–3 sentences. The more specific, the better your ads.">
                <textarea className="textarea" required minLength={10} value={info.description}
                  onChange={(e) => setInfo({ ...info, description: e.target.value })}
                  placeholder="We build cloud-native developer tools for distributed teams…" />
              </Field>
              <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Continue →'}
              </button>
            </form>
          )}

          {step === 1 && (
            <div>
              <p className="sub mb-16">
                Upload anything that captures your brand. A logo is highly recommended — it gets
                composited onto every image ad. Everything else sharpens the AI's analysis.
              </p>
              <div className="col" style={{ gap: 14 }}>
                {ASSET_TYPES.map((t) => {
                  const assets = (playbook?.assets ?? []).filter((x) => x.type === t.id);
                  return (
                    <div key={t.id} className="card" style={{ padding: 16 }}>
                      <div className="row-between">
                        <div className="row">
                          <span style={{ fontSize: 22 }}>{t.icon}</span>
                          <div>
                            <div style={{ fontWeight: 700 }}>{t.label}</div>
                            <div className="sub" style={{ fontSize: 12 }}>{t.desc}</div>
                          </div>
                        </div>
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={uploading !== null}
                          onClick={() => fileInputs.current[t.id]?.click()}
                        >
                          {uploading === t.id ? 'Uploading…' : '+ Upload'}
                        </button>
                        <input
                          ref={(el) => { fileInputs.current[t.id] = el; }}
                          type="file"
                          accept={t.id === 'guideline' ? 'application/pdf' : 'image/*'}
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) upload(t.id, f);
                            e.target.value = '';
                          }}
                        />
                      </div>
                      {assets.length > 0 && (
                        <div className="row mt-12" style={{ flexWrap: 'wrap' }}>
                          {assets.map((asset) => (
                            <AssetThumb key={asset.id} assetId={asset.id} filename={asset.filename}
                              onDelete={() => removeAsset(asset.id)} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="row mt-24">
                <button className="btn btn-ghost" onClick={() => setStep(0)}>← Back</button>
                <button className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={busy} onClick={startAnalysis}>
                  {busy ? 'Starting…' : 'Analyze my brand ✨'}
                </button>
              </div>
              <p className="sub mt-8" style={{ textAlign: 'center', fontSize: 12 }}>
                You can skip uploads — the AI will work from your description alone.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="col" style={{ alignItems: 'center', padding: '32px 0' }}>
              <CenterSpinner label="Our AI is studying your brand…" />
              <p className="sub" style={{ maxWidth: 420, textAlign: 'center' }}>
                We're extracting your palette, tone of voice, personality and creative rules.
                This usually takes under a minute.
              </p>
            </div>
          )}

          {step === 3 && a && (
            <div className="col" style={{ gap: 18 }}>
              <div>
                <div className="label-caps mb-8">Color palette</div>
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  {a.colors.map((c) => (
                    <div key={c.hex} className="row" style={{ gap: 8 }}>
                      <span style={{ width: 28, height: 28, borderRadius: 8, background: c.hex, border: '1px solid var(--outline-variant)' }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12.5 }}>{c.name}</div>
                        <div className="mono sub" style={{ fontSize: 10.5 }}>{c.hex}{c.role ? ` · ${c.role}` : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="label-caps mb-8">Personality</div>
                <div className="chip-row">
                  {a.personality.map((p) => <span key={p} className="chip active" style={{ cursor: 'default' }}>{p}</span>)}
                </div>
              </div>
              <div className="grid grid-2">
                <div className="card" style={{ padding: 14 }}>
                  <div className="label-caps mb-8">Tone of voice</div>
                  <p style={{ fontSize: 13 }}>{a.toneOfVoice}</p>
                </div>
                <div className="card" style={{ padding: 14 }}>
                  <div className="label-caps mb-8">Visual style</div>
                  <p style={{ fontSize: 13 }}>{a.visualStyle}</p>
                </div>
                <div className="card" style={{ padding: 14 }}>
                  <div className="label-caps mb-8">Target audience</div>
                  <p style={{ fontSize: 13 }}>{a.targetAudience}</p>
                </div>
                <div className="card" style={{ padding: 14 }}>
                  <div className="label-caps mb-8">Brand rules</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                    {a.brandRules.map((r) => <li key={r}>{r}</li>)}
                  </ul>
                </div>
              </div>
              <div className="row">
                <button className="btn btn-ghost" disabled={busy} onClick={startAnalysis}>↻ Re-analyze</button>
                <button className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={busy} onClick={approve}>
                  {busy ? 'Approving…' : 'Looks right — approve playbook ✓'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
