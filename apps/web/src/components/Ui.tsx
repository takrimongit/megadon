import React from 'react';

export function Spinner({ large, label }: { large?: boolean; label?: string }) {
  return (
    <div className="col" style={{ alignItems: 'center', gap: 12 }}>
      <div className={`spinner ${large ? 'lg' : ''}`} />
      {label ? <div className="sub">{label}</div> : null}
    </div>
  );
}

export function CenterSpinner({ label }: { label?: string }) {
  return (
    <div className="center-fill">
      <Spinner large label={label} />
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {error ? <span className="error-text">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel?: string;
}) {
  return (
    <label className="switch" aria-label={ariaLabel}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" />
      <span className="thumb" />
    </label>
  );
}

export function Modal({
  onClose,
  children,
  width,
}: {
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={width ? { maxWidth: width } : undefined}>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: string;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card col" style={{ alignItems: 'center', textAlign: 'center', padding: 48 }}>
      <div style={{ fontSize: 40 }}>{icon}</div>
      <h3>{title}</h3>
      <p className="sub" style={{ maxWidth: 380 }}>{body}</p>
      {action ? <div className="mt-8">{action}</div> : null}
    </div>
  );
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="stepper">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          {i > 0 && <div className={`step-line ${i <= current ? 'done' : ''}`} />}
          <div className={`step ${i < current ? 'done' : i === current ? 'current' : ''}`}>
            <div className="dot">{i < current ? '✓' : i + 1}</div>
            <div className="step-label">{s}</div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

export const statusBadge: Record<string, { label: string; cls: string }> = {
  queued: { label: 'Queued', cls: 'badge-primary' },
  generating: { label: 'Generating', cls: 'badge-primary' },
  pending_review: { label: 'Pending Review', cls: 'badge-warning' },
  pending: { label: 'Pending', cls: 'badge-warning' },
  approved: { label: 'Approved', cls: 'badge-success' },
  rejected: { label: 'Rejected', cls: 'badge-error' },
  archived: { label: 'Archived', cls: 'badge-neutral' },
  failed: { label: 'Failed', cls: 'badge-error' },
  ready: { label: 'Ready', cls: 'badge-success' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = statusBadge[status] ?? { label: status, cls: 'badge-neutral' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}
