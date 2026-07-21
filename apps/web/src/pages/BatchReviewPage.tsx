import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import type { Ad, Batch, Revision } from '@megadon/types';
import { api } from '../lib/api';
import { getDb } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { useToast } from '../lib/Toast';
import { CenterSpinner, EmptyState, Modal, StatusBadge } from '../components/Ui';
import { AdMedia } from '../components/AdMedia';
import { useRevisionAssetUrl } from '../lib/useSignedUrl';

const PLATFORM_ICON: Record<string, string> = {
  instagram: '📸', tiktok: '🎵', facebook: '👥', youtube: '▶️', linkedin: '💼',
};

function RevisionPanel({ ad, onClose }: { ad: Ad; onClose: () => void }) {
  const { workspaceId } = useAuth();
  const toast = useToast();
  const [instruction, setInstruction] = useState('');
  const [revisionId, setRevisionId] = useState<string | null>(null);
  const [revision, setRevision] = useState<Revision | null>(null);
  const [busy, setBusy] = useState(false);
  const revisionUrl = useRevisionAssetUrl(
    revision?.status === 'ready' ? ad.id : undefined,
    revision?.status === 'ready' ? revisionId ?? undefined : undefined,
  );

  // Live-watch the requested revision document.
  useEffect(() => {
    if (!workspaceId || !revisionId) return;
    const ref = doc(
      getDb(),
      `workspaces/${workspaceId}/batches/${ad.batchId}/ads/${ad.id}/revisions/${revisionId}`,
    );
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setRevision({ id: snap.id, ...snap.data() } as Revision);
    });
    return unsub;
  }, [workspaceId, ad.batchId, ad.id, revisionId]);

  const request = async () => {
    if (!instruction.trim()) return;
    setBusy(true);
    try {
      const { revisionId: id } = await api.requestRevision(ad.id, instruction.trim());
      setRevisionId(id);
      setRevision(null);
    } catch (e: any) {
      toast(e?.message ?? 'Revision request failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const accept = async () => {
    if (!revisionId) return;
    setBusy(true);
    try {
      await api.acceptRevision(ad.id, revisionId);
      toast('Revision applied to the ad ✓', 'success');
      onClose();
    } catch (e: any) {
      toast(e?.message ?? 'Could not accept revision', 'error');
      setBusy(false);
    }
  };

  const QUICK = ['Make it more vibrant', 'Simplify the background', 'More premium feel', 'Add more energy'];

  return (
    <div style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: 16, marginTop: 16 }}>
      <div className="label-caps mb-8">🪄 AI Revision</div>

      {!revisionId && (
        <>
          <div className="chip-row mb-8">
            {QUICK.map((q) => (
              <button key={q} className="chip" onClick={() => setInstruction(q)}>{q}</button>
            ))}
          </div>
          <textarea className="textarea" placeholder="Tell the AI what to change — “warmer lighting, focus on the product, shorter headline”…"
            value={instruction} onChange={(e) => setInstruction(e.target.value)} />
          <button className="btn btn-primary mt-8" disabled={busy || !instruction.trim()} onClick={request}>
            {busy ? 'Sending…' : 'Generate revision'}
          </button>
        </>
      )}

      {revisionId && revision && revision.status !== 'ready' && revision.status !== 'failed' && (
        <div className="row" style={{ padding: '18px 0' }}>
          <div className="spinner" />
          <div>
            <strong>Revising…</strong>
            <p className="sub" style={{ fontSize: 12 }}>“{revision.instruction}” — usually under a minute.</p>
          </div>
        </div>
      )}

      {revision?.status === 'failed' && (
        <div className="badge badge-error" style={{ display: 'flex', padding: 12 }}>
          Revision failed — try a different instruction.
          <button className="btn btn-ghost btn-sm" onClick={() => { setRevisionId(null); setRevision(null); }}>Retry</button>
        </div>
      )}

      {revision?.status === 'ready' && (
        <div>
          <div className="grid grid-2 mb-16">
            <div>
              <div className="label-caps mb-8">Before</div>
              <AdMedia ad={ad} />
            </div>
            <div>
              <div className="label-caps mb-8">After</div>
              <div className="ad-tile">
                {revisionUrl ? (
                  ad.mediaType === 'video'
                    ? <video src={revisionUrl} controls muted loop playsInline />
                    : <img src={revisionUrl} alt="Revised creative" />
                ) : (
                  <div className="center-fill" style={{ minHeight: 0, height: '100%' }}><div className="spinner" /></div>
                )}
              </div>
            </div>
          </div>
          {(revision.headline || revision.body) && (
            <div className="card mb-16" style={{ padding: 14, background: 'var(--surface-low)' }}>
              {revision.headline && <div><strong>{revision.headline}</strong></div>}
              {revision.body && <p className="sub" style={{ fontSize: 13 }}>{revision.body}</p>}
              {revision.cta && <span className="badge badge-primary mt-8">{revision.cta}</span>}
            </div>
          )}
          <div className="row">
            <button className="btn btn-ghost" onClick={() => { setRevisionId(null); setRevision(null); }}>
              ↻ Try another instruction
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy} onClick={accept}>
              {busy ? 'Applying…' : 'Accept revision ✓'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BatchReviewPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const { workspaceId } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [ads, setAds] = useState<Ad[] | null>(null);
  const [openAdId, setOpenAdId] = useState<string | null>(null);
  const [revising, setRevising] = useState(false);

  useEffect(() => {
    if (!workspaceId || !batchId) return;
    const unsubBatch = onSnapshot(
      doc(getDb(), `workspaces/${workspaceId}/batches/${batchId}`),
      (snap) => {
        if (snap.exists()) setBatch({ id: snap.id, ...snap.data() } as Batch);
      },
    );
    const unsubAds = onSnapshot(
      query(
        collection(getDb(), `workspaces/${workspaceId}/batches/${batchId}/ads`),
        orderBy('createdAt', 'asc'),
      ),
      (snap) => setAds(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Ad)),
    );
    return () => { unsubBatch(); unsubAds(); };
  }, [workspaceId, batchId]);

  const openAd = useMemo(() => ads?.find((a) => a.id === openAdId) ?? null, [ads, openAdId]);
  const reviewable = useMemo(() => (ads ?? []).filter((a) => a.status !== 'generating'), [ads]);

  const decide = useCallback(async (ad: Ad, status: 'approved' | 'rejected') => {
    try {
      if (status === 'approved') await api.approveAd(ad.id);
      else await api.rejectAd(ad.id);
    } catch (e: any) {
      toast(e?.message ?? 'Could not save decision', 'error');
    }
  }, [toast]);

  const goNext = useCallback((dir: 1 | -1) => {
    if (!openAd || reviewable.length === 0) return;
    const idx = reviewable.findIndex((a) => a.id === openAd.id);
    const next = reviewable[(idx + dir + reviewable.length) % reviewable.length];
    setRevising(false);
    setOpenAdId(next.id);
  }, [openAd, reviewable]);

  // Keyboard review: A approve, R reject, arrows navigate, Esc close.
  useEffect(() => {
    if (!openAd) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === 'a' || e.key === 'A') { decide(openAd, 'approved'); goNext(1); }
      else if (e.key === 'r' || e.key === 'R') { decide(openAd, 'rejected'); goNext(1); }
      else if (e.key === 'ArrowRight') goNext(1);
      else if (e.key === 'ArrowLeft') goNext(-1);
      else if (e.key === 'Escape') setOpenAdId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openAd, decide, goNext]);

  if (!batch || ads === null) return <div className="page"><CenterSpinner label="Loading batch…" /></div>;

  const generating = batch.status === 'queued' || batch.status === 'generating';
  const pct = Math.round((batch.progress.completed / Math.max(batch.progress.total, 1)) * 100);
  const pending = ads.filter((a) => a.status === 'pending').length;

  return (
    <div className="page">
      <div className="row-between mb-16">
        <div className="row">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/batches')}>←</button>
          <div>
            <h1 className="h-page">{batch.name}</h1>
            <p className="sub">
              {batch.brief?.mediaType === 'video' ? '🎬 Video' : '🖼️ Image'} batch
              {' · '}{batch.progress.completed}/{batch.progress.total} generated
              {pending > 0 ? ` · ${pending} awaiting review` : ''}
            </p>
          </div>
        </div>
        <StatusBadge status={batch.status} />
      </div>

      {generating && (
        <div className="card mb-24" style={{ background: 'var(--primary-container)', border: 'none' }}>
          <div className="row-between mb-8">
            <strong style={{ color: 'var(--primary)' }}>🤖 Generating your ads…</strong>
            <span className="mono" style={{ color: 'var(--primary)', fontWeight: 700 }}>{pct}%</span>
          </div>
          <div className="progress-track" style={{ background: 'rgba(255,255,255,0.6)' }}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <p className="sub mt-8" style={{ fontSize: 12 }}>
            This page updates live — finished ads appear below as they're ready. You can start reviewing right away.
          </p>
        </div>
      )}

      {pending > 1 && (
        <div className="row mb-16 sub" style={{ fontSize: 12.5 }}>
          💡 Pro tip: open an ad and use <kbd>A</kbd> approve · <kbd>R</kbd> reject · <kbd>←</kbd><kbd>→</kbd> navigate for rapid review.
        </div>
      )}

      {ads.length === 0 ? (
        <EmptyState icon="⏳" title="Ads are queueing" body="The first creatives should appear here within a few seconds." />
      ) : (
        <div className="grid grid-3">
          {ads.map((ad) => (
            <div key={ad.id} className="card clickable" style={{ padding: 12 }}
              onClick={() => { setRevising(false); setOpenAdId(ad.id); }}>
              <AdMedia ad={ad} />
              <div className="row-between mt-8">
                <span className="sub" style={{ fontSize: 12 }}>
                  {PLATFORM_ICON[ad.platform] ?? ''} {ad.platform}
                  {typeof ad.score === 'number' ? ` · ${ad.score}` : ''}
                </span>
                <StatusBadge status={ad.status} />
              </div>
              {ad.status === 'pending' && (
                <div className="row mt-8">
                  <button className="btn btn-success btn-sm" style={{ flex: 1 }}
                    onClick={(e) => { e.stopPropagation(); decide(ad, 'approved'); }}>✓ Approve</button>
                  <button className="btn btn-danger btn-sm" style={{ flex: 1 }}
                    onClick={(e) => { e.stopPropagation(); decide(ad, 'rejected'); }}>✕ Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {openAd && (
        <Modal onClose={() => setOpenAdId(null)}>
          <div style={{ padding: 24 }}>
            <div className="row-between mb-16">
              <div className="row">
                <h2 className="h-section">
                  {PLATFORM_ICON[openAd.platform] ?? ''} {openAd.platform} ad
                </h2>
                <StatusBadge status={openAd.status} />
                {typeof openAd.score === 'number' && (
                  <span className="badge badge-primary">Score {openAd.score}</span>
                )}
              </div>
              <div className="row">
                <button className="btn btn-ghost btn-sm" onClick={() => goNext(-1)}>←</button>
                <button className="btn btn-ghost btn-sm" onClick={() => goNext(1)}>→</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setOpenAdId(null)}>✕</button>
              </div>
            </div>

            <div className="grid grid-2">
              <AdMedia ad={openAd} controls matchAspect />
              <div className="col">
                {openAd.hook && (
                  <div>
                    <div className="label-caps">Hook</div>
                    <p style={{ fontSize: 13.5 }}>{openAd.hook}</p>
                  </div>
                )}
                {openAd.headline && (
                  <div>
                    <div className="label-caps">Headline</div>
                    <p style={{ fontWeight: 700, fontSize: 16 }}>{openAd.headline}</p>
                  </div>
                )}
                {openAd.body && (
                  <div>
                    <div className="label-caps">Body</div>
                    <p style={{ fontSize: 13.5 }}>{openAd.body}</p>
                  </div>
                )}
                {openAd.cta && (
                  <div>
                    <div className="label-caps">CTA</div>
                    <span className="badge badge-primary" style={{ fontSize: 13 }}>{openAd.cta}</span>
                  </div>
                )}
                {openAd.status !== 'generating' && (
                  <div className="row mt-8">
                    <button className="btn btn-success" style={{ flex: 1 }}
                      onClick={() => { decide(openAd, 'approved'); goNext(1); }}>✓ Approve</button>
                    <button className="btn btn-danger" style={{ flex: 1 }}
                      onClick={() => { decide(openAd, 'rejected'); goNext(1); }}>✕ Reject</button>
                    <button className="btn btn-ghost" onClick={() => setRevising((r) => !r)}>🪄 Revise</button>
                  </div>
                )}
              </div>
            </div>

            {revising && <RevisionPanel ad={openAd} onClose={() => { setRevising(false); setOpenAdId(null); }} />}
          </div>
        </Modal>
      )}
    </div>
  );
}
