// Shared "nothing here yet" state — a small outline VHS cassette instead of
// a bare text line, used wherever a list/queue/history has zero items.
export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
      <svg width="56" height="56" viewBox="0 0 64 64" fill="none" style={{ margin: '0 auto 1rem', opacity: 0.5 }} aria-hidden="true">
        <rect x="4" y="14" width="56" height="36" rx="3" stroke="var(--muted)" strokeWidth="2" />
        <circle cx="20" cy="32" r="7" stroke="var(--muted)" strokeWidth="2" />
        <circle cx="44" cy="32" r="7" stroke="var(--muted)" strokeWidth="2" />
        <rect x="14" y="42" width="36" height="4" rx="1" fill="var(--muted)" />
      </svg>
      <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--cream-dim)', fontSize: 13, letterSpacing: 0.5, margin: 0 }}>{title}</p>
      {subtitle && <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--cream-dim)', fontSize: 11, marginTop: 6 }}>{subtitle}</p>}
    </div>
  )
}

// Shared fetch-failure state — a static-glitch VHS cassette instead of a
// lying "nothing here" empty state or a skeleton that spins forever.
// Every page's initial-load fetch should render this (with a retry that
// re-runs that same fetch) instead of silently treating a failed request
// as "no data yet".
export function ErrorState({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
      <svg width="56" height="56" viewBox="0 0 64 64" fill="none" style={{ margin: '0 auto 1rem', opacity: 0.6 }} aria-hidden="true">
        <rect x="4" y="14" width="56" height="36" rx="3" stroke="#f87171" strokeWidth="2" />
        <path d="M14 24l8 16M22 24l-8 16" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
        <path d="M36 24l8 16M44 24l-8 16" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
        <rect x="14" y="42" width="36" height="4" rx="1" fill="#f87171" />
      </svg>
      <p style={{ fontFamily: 'var(--font-mono)', color: '#f87171', fontSize: 13, letterSpacing: 1, margin: 0 }}>◼ SIGNAL LOST</p>
      <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--cream-dim)', fontSize: 11, marginTop: 6 }}>{message ?? 'Something went wrong loading this.'}</p>
      <button
        onClick={onRetry}
        className="vcr-btn"
        style={{ marginTop: 16, fontSize: 11, padding: '0.5rem 1.25rem', letterSpacing: 1 }}
      >
        ↻ RETRY
      </button>
    </div>
  )
}
