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
      {subtitle && <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)', fontSize: 11, marginTop: 6 }}>{subtitle}</p>}
    </div>
  )
}
