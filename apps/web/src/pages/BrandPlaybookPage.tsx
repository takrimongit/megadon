import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { useToast } from '../lib/Toast';
import { CenterSpinner, EmptyState } from '../components/Ui';
import { useBrandAssetUrl } from '../lib/useSignedUrl';

function AssetThumb({ assetId, filename }: { assetId: string; filename?: string }) {
  const url = useBrandAssetUrl(assetId);
  return (
    <div style={{ width: 88, height: 88, borderRadius: 10, overflow: 'hidden', background: 'var(--surface-low)' }} title={filename}>
      {url ? <img src={url} alt={filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
    </div>
  );
}

export default function BrandPlaybookPage() {
  const { playbook, refreshPlaybook } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [reanalyzing, setReanalyzing] = useState(false);

  // While re-analyzing, poll until ready.
  useEffect(() => {
    if (!reanalyzing) return;
    const t = setInterval(async () => {
      const pb = await api.getBrandPlaybook();
      if (pb.status === 'ready' || pb.status === 'approved' || pb.status === 'failed') {
        await refreshPlaybook();
        setReanalyzing(false);
        if (pb.status === 'failed') toast('Re-analysis failed — try again.', 'error');
        else toast('Brand analysis refreshed ✓', 'success');
      }
    }, 3000);
    return () => clearInterval(t);
  }, [reanalyzing, refreshPlaybook, toast]);

  if (!playbook) return <div className="page"><CenterSpinner /></div>;
  const a = playbook.analysis;

  if (!a) {
    return (
      <div className="page">
        <EmptyState icon="🎨" title="No brand playbook yet"
          body="Complete brand onboarding to build your playbook."
          action={<button className="btn btn-primary" onClick={() => navigate('/onboarding')}>Set up brand</button>} />
      </div>
    );
  }

  const reanalyze = async () => {
    try {
      await api.analyzeBrand();
      setReanalyzing(true);
    } catch (e: any) {
      toast(e?.message ?? 'Could not start re-analysis', 'error');
    }
  };

  return (
    <div className="page page-narrow">
      <div className="row-between mb-24">
        <div>
          <h1 className="h-page">🎨 Brand Playbook</h1>
          <p className="sub">{playbook.info?.companyName} · {playbook.info?.industry}</p>
        </div>
        <button className="btn btn-ghost" disabled={reanalyzing} onClick={reanalyze}>
          {reanalyzing ? 'Re-analyzing…' : '↻ Re-analyze'}
        </button>
      </div>

      <div className="card mb-16">
        <div className="label-caps mb-8">Color palette</div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 16 }}>
          {a.colors.map((c) => (
            <div key={c.hex} className="row" style={{ gap: 8 }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: c.hex, border: '1px solid var(--outline-variant)' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                <div className="mono sub" style={{ fontSize: 11 }}>{c.hex}{c.role ? ` · ${c.role}` : ''}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-2 mb-16">
        <div className="card">
          <div className="label-caps mb-8">Personality</div>
          <div className="chip-row">
            {a.personality.map((p) => <span key={p} className="chip active" style={{ cursor: 'default' }}>{p}</span>)}
          </div>
        </div>
        <div className="card">
          <div className="label-caps mb-8">Tone of voice</div>
          <p style={{ fontSize: 13.5 }}>{a.toneOfVoice}</p>
        </div>
        <div className="card">
          <div className="label-caps mb-8">Visual style</div>
          <p style={{ fontSize: 13.5 }}>{a.visualStyle}</p>
        </div>
        <div className="card">
          <div className="label-caps mb-8">Target audience</div>
          <p style={{ fontSize: 13.5 }}>{a.targetAudience}</p>
        </div>
      </div>

      <div className="card mb-16">
        <div className="label-caps mb-8">Brand rules</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5 }}>
          {a.brandRules.map((r) => <li key={r} style={{ marginBottom: 4 }}>{r}</li>)}
        </ul>
      </div>

      {a.ctaPreferences.length > 0 && (
        <div className="card mb-16">
          <div className="label-caps mb-8">Preferred CTAs</div>
          <div className="chip-row">
            {a.ctaPreferences.map((c) => <span key={c} className="chip" style={{ cursor: 'default' }}>{c}</span>)}
          </div>
        </div>
      )}

      {(playbook.assets ?? []).length > 0 && (
        <div className="card">
          <div className="label-caps mb-8">Brand assets</div>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {playbook.assets.map((asset) => (
              <AssetThumb key={asset.id} assetId={asset.id} filename={asset.filename} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
