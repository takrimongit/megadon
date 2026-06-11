import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import type { Batch } from '@megadon/types';
import { getDb } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { CenterSpinner, EmptyState, StatusBadge } from '../components/Ui';

const FILTERS = ['all', 'generating', 'pending_review', 'approved'] as const;

export default function BatchesPage() {
  const { workspaceId } = useAuth();
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');

  useEffect(() => {
    if (!workspaceId) return;
    const q = query(
      collection(getDb(), `workspaces/${workspaceId}/batches`),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setBatches(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Batch));
    });
    return unsub;
  }, [workspaceId]);

  const visible = (batches ?? []).filter((b) => {
    if (filter === 'all') return true;
    if (filter === 'generating') return b.status === 'generating' || b.status === 'queued';
    return b.status === filter;
  });

  return (
    <div className="page">
      <div className="row-between mb-16">
        <h1 className="h-page">Batches</h1>
        <Link to="/campaigns/new" className="btn btn-primary">✨ New Campaign</Link>
      </div>

      <div className="tabs mb-24">
        {FILTERS.map((f) => (
          <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'generating' ? 'Generating' : f === 'pending_review' ? 'Needs review' : 'Approved'}
          </button>
        ))}
      </div>

      {batches === null ? (
        <CenterSpinner />
      ) : visible.length === 0 ? (
        <EmptyState icon="🗂️" title="Nothing here"
          body={filter === 'all' ? 'Create a campaign to generate your first batch of ads.' : 'No batches match this filter.'}
          action={filter === 'all' ? <Link to="/campaigns/new" className="btn btn-primary">Create campaign</Link> : undefined} />
      ) : (
        <div className="col">
          {visible.map((b) => {
            const pct = Math.round((b.progress.completed / Math.max(b.progress.total, 1)) * 100);
            return (
              <div key={b.id} className="card clickable" onClick={() => navigate(`/batches/${b.id}`)}>
                <div className="row-between">
                  <div className="row">
                    <span style={{ fontSize: 22 }}>{b.brief?.mediaType === 'video' ? '🎬' : '🖼️'}</span>
                    <div>
                      <strong>{b.name}</strong>
                      <div className="sub" style={{ fontSize: 12 }}>
                        {new Date(b.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        {' · '}{b.brief?.platforms?.join(', ')}
                        {' · '}{b.progress.completed}/{b.progress.total} ads
                        {b.counters?.approved ? ` · ✅ ${b.counters.approved}` : ''}
                        {b.counters?.rejected ? ` · ❌ ${b.counters.rejected}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 16 }}>
                    {(b.status === 'generating' || b.status === 'queued') && (
                      <div style={{ width: 140 }}>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                    <StatusBadge status={b.status} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
