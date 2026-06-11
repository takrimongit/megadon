import { useEffect, useState } from 'react';
import { api, type InsightsResponse, type PlaybookResponse } from '../lib/api';
import { CenterSpinner } from '../components/Ui';

export default function AnalyticsPage() {
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [playbook, setPlaybook] = useState<PlaybookResponse | null>(null);

  useEffect(() => {
    api.insights().then(setInsights).catch(() => setInsights({ insights: [] }));
    api.playbook().then(setPlaybook).catch(() => setPlaybook(null));
  }, []);

  if (!insights) return <div className="page"><CenterSpinner label="Crunching the numbers…" /></div>;

  return (
    <div className="page">
      <h1 className="h-page mb-8">📈 Learn</h1>
      <p className="sub mb-24">
        What the AI has learned from your approvals, rejections and performance — and how it
        improves your next batch.
      </p>

      <div className="grid grid-4 mb-24">
        {insights.insights.map((i) => (
          <div key={i.label} className="card stat-card">
            <div className="row-between">
              <span className="label-caps">{i.label}</span>
              <span>{i.icon}</span>
            </div>
            <div className="stat-value">{i.value}</div>
            <span className={`badge ${i.positive ? 'badge-success' : 'badge-error'} mt-8`}>
              {i.trend}
            </span>
          </div>
        ))}
      </div>

      {playbook && (
        <>
          <div className="row-between mb-16">
            <h2 className="h-section">🧠 Learned playbook rules</h2>
            <span className="sub" style={{ fontSize: 12 }}>
              From {playbook.campaignCount} campaigns · {playbook.adCount} ads · updated{' '}
              {new Date(playbook.lastUpdated).toLocaleDateString()}
            </span>
          </div>
          <div className="grid grid-2">
            {playbook.rules.map((r) => (
              <div key={r.title} className="card">
                <div className="row mb-8">
                  <span style={{ fontSize: 20 }}>{r.icon}</span>
                  <strong>{r.title}</strong>
                </div>
                <p className="sub mb-8" style={{ fontSize: 13 }}>{r.value}</p>
                <div className="row" style={{ gap: 8 }}>
                  <div className="progress-track" style={{ flex: 1 }}>
                    <div className="progress-fill" style={{ width: `${Math.round(r.confidence * 100)}%` }} />
                  </div>
                  <span className="mono sub" style={{ fontSize: 11 }}>
                    {Math.round(r.confidence * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
