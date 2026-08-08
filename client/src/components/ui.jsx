export function LoadingState({ label = 'Loading...' }) {
  return <div className="rounded-lg bg-white/70 p-8 text-center text-slate">{label}</div>;
}

export function ErrorState({ message }) {
  return (
    <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-danger">
      {message || 'Something went wrong'}
    </div>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div className="rounded-lg border border-dashed border-mist bg-white/60 px-6 py-10 text-center">
      <p className="font-display text-lg text-ink">{title}</p>
      {description && <p className="mt-2 text-sm text-slate">{description}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-slate">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-mist text-ink',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/15 text-warning',
    danger: 'bg-danger/15 text-danger',
    sea: 'bg-sea/15 text-sea',
  };
  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
