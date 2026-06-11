import { useEffect, useState } from 'react';
import type { AiPricingTable, UsageSummary } from '@megadon/types';
import { api } from '../lib/api';
import { CenterSpinner, EmptyState } from '../components/Ui';
import { estimateLabel, fmtCredits, fmtUsd } from '../lib/pricing';

const SURFACE_LABEL: Record<string, string> = {
  chat: '✍️ Copy generation',
  revise: '🪄 Copy revisions',
  personas: '👥 Personas',
  analyze: '🎨 Brand analysis',
  image: '🖼️ Image creative',
  video: '🎬 Video creative',
};

function BucketBars({ buckets, mono }: { buckets: UsageSummary['byModel']; mono?: boolean }) {
  const max = Math.max(...buckets.map((b) => b.estCredits), 1);
  return (
    <div className="col" style={{ gap: 10 }}>
      {buckets.map((b) => (
        <div key={b.key}>
          <div className="row-between" style={{ marginBottom: 4 }}>
            <span className={mono ? 'mono' : ''} style={{ fontSize: 12.5, fontWeight: 600 }}>
              {SURFACE_LABEL[b.key] ?? b.key}
            </span>
            <span className="sub mono" style={{ fontSize: 11.5 }}>
              {b.operations} ops · {fmtCredits(b.estCredits)} cr · {fmtUsd(b.estUsd)}
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${Math.max((b.estCredits / max) * 100, 2)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function UsagePage() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [pricing, setPricing] = useState<AiPricingTable | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.usageSummary(), api.usagePricing()])
      .then(([s, p]) => { setSummary(s); setPricing(p); })
      .catch((e) => setError(e?.message ?? 'Could not load usage'));
  }, []);

  if (error) return <div className="page"><EmptyState icon="⚠️" title="Couldn't load usage" body={error} /></div>;
  if (!summary || !pricing) return <div className="page"><CenterSpinner label="Reading the meter…" /></div>;

  const hasUsage = summary.totals.operations > 0;

  return (
    <div className="page page-narrow">
      <h1 className="h-page mb-8">⚡ Token Meter</h1>
      <p className="sub mb-24">
        Live kie.ai credit balance plus estimated consumption across every model, last {summary.windowDays} days.
        Figures marked ≈ are estimates from published per-operation pricing — exact billing lives in your kie.ai dashboard.
      </p>

      <div className="grid grid-3 mb-24">
        <div className="card stat-card" style={{ background: 'var(--grad)', border: 'none', color: '#fff' }}>
          <span className="label-caps" style={{ color: 'rgba(255,255,255,0.8)' }}>kie.ai credits left</span>
          <div className="stat-value">
            {summary.creditsRemaining === null ? '—' : fmtCredits(summary.creditsRemaining)}
          </div>
          <span style={{ fontSize: 12, opacity: 0.85 }}>
            {summary.creditsRemainingUsd === null ? 'balance unavailable' : `≈ ${fmtUsd(summary.creditsRemainingUsd)} remaining`}
          </span>
        </div>
        <div className="card stat-card">
          <span className="label-caps">AI operations ({summary.windowDays}d)</span>
          <div className="stat-value">{summary.totals.operations.toLocaleString()}</div>
        </div>
        <div className="card stat-card">
          <span className="label-caps">Est. spend ({summary.windowDays}d)</span>
          <div className="stat-value">{fmtUsd(summary.totals.estUsd)}</div>
          <span className="sub" style={{ fontSize: 12 }}>≈ {fmtCredits(summary.totals.estCredits)} credits</span>
        </div>
      </div>

      {!hasUsage ? (
        <EmptyState icon="📭" title="No AI usage yet in this window"
          body="Generate a batch and your per-model consumption will show up here." />
      ) : (
        <div className="grid grid-2 mb-24">
          <div className="card">
            <h2 className="h-section mb-16">By model</h2>
            <BucketBars buckets={summary.byModel} mono />
          </div>
          <div className="card">
            <h2 className="h-section mb-16">By surface</h2>
            <BucketBars buckets={summary.bySurface} />
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="h-section mb-8">Per-operation price list</h2>
        <p className="sub mb-16" style={{ fontSize: 12.5 }}>
          What one operation costs on each model (1 credit = {fmtUsd(pricing.creditUsd)}). These power
          the estimates shown in the wizard and Geek Mode.
        </p>
        <div className="col" style={{ gap: 8 }}>
          {Object.entries(pricing.models).map(([model, p]) => (
            <div key={model} className="row-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--outline-variant)' }}>
              <span className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>{model}</span>
              <span className="sub mono" style={{ fontSize: 11.5 }}>{estimateLabel(p)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
