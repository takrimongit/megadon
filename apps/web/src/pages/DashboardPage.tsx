import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import type { Batch, DashboardStats } from '@megadon/types';
import { api } from '../lib/api';
import { getDb } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { CenterSpinner, EmptyState, StatusBadge } from '../components/Ui';

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export default function DashboardPage() {
  const { workspaceId, playbook } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [batches, setBatches] = useState<Batch[] | null>(null);

  useEffect(() => {
    api.dashboardStats().then(setStats).catch(() => setStats(null));
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    const q = query(
      collection(getDb(), `workspaces/${workspaceId}/batches`),
      orderBy('createdAt', 'desc'),
      limit(6),
    );
    const unsub = onSnapshot(q, (snap) => {
      setBatches(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Batch));
    });
    return unsub;
  }, [workspaceId]);

  const statCards = stats
    ? [
        { label: 'Active campaigns', value: String(stats.activeCampaigns), icon: '🚀' },
        { label: 'Ads generated', value: fmt(stats.adsGenerated), icon: '🎨' },
        { label: 'Approval rate', value: `${Math.round(stats.approvalRate * 100)}%`, icon: '✅' },
        { label: 'Avg ROAS', value: `${stats.avgRoas.toFixed(1)}x`, icon: '📈' },
      ]
    : [];

  return (
    <div className="page">
      <div className="row-between mb-24">
        <div>
          <h1 className="h-page">Welcome back 👋</h1>
          <p className="sub">
            {playbook?.info?.companyName ? `${playbook.info.companyName} · ` : ''}
            Here's how your ad engine is doing.
          </p>
        </div>
        <Link to="/campaigns/new" className="btn btn-primary btn-lg">✨ New Campaign</Link>
      </div>

      {stats ? (
        <div className="grid grid-4 mb-24">
          {statCards.map((s) => (
            <div key={s.label} className="card stat-card">
              <div className="row-between">
                <span className="label-caps">{s.label}</span>
                <span>{s.icon}</span>
              </div>
              <div className="stat-value">{s.value}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div
        className="card mb-24"
        style={{ background: 'var(--grad)', color: '#fff', border: 'none' }}
      >
        <div className="row">
          <span style={{ fontSize: 26 }}>🧠</span>
          <div>
            <div style={{ fontWeight: 700 }}>AI Insight</div>
            <p style={{ fontSize: 13, opacity: 0.9 }}>
              Bold creatives with a single clear CTA are outperforming carousel-style copy this
              month. Your next batch will lean into that automatically.
            </p>
          </div>
        </div>
      </div>

      <div className="row-between mb-16">
        <h2 className="h-section">Recent batches</h2>
        <Link to="/batches" className="sub">View all →</Link>
      </div>

      {batches === null ? (
        <CenterSpinner />
      ) : batches.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title="No batches yet"
          body="Create your first campaign and AdForge will generate a full batch of on-brand ads in minutes."
          action={<Link to="/campaigns/new" className="btn btn-primary">Create your first campaign</Link>}
        />
      ) : (
        <div className="grid grid-3">
          {batches.map((b) => (
            <div key={b.id} className="card clickable" onClick={() => navigate(`/batches/${b.id}`)}>
              <div className="row-between mb-8">
                <strong style={{ fontSize: 14.5 }}>{b.name}</strong>
                <StatusBadge status={b.status} />
              </div>
              <div className="sub mb-8" style={{ fontSize: 12 }}>
                {b.progress.completed}/{b.progress.total} ads
                {b.counters?.approved ? ` · ${b.counters.approved} approved` : ''}
                {b.brief?.mediaType === 'video' ? ' · 🎬 video' : ''}
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.round((b.progress.completed / Math.max(b.progress.total, 1)) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
