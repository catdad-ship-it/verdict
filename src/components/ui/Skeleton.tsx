// Loading placeholders shaped like the real content (VHSCard / QueueRow),
// so pages don't jump/reflow once data arrives — swapped in wherever a page
// used to show a plain "LOADING..." text block.

export function CardSkeleton() {
  return (
    <div className="rounded-sm overflow-hidden" style={{ background: 'var(--card)' }}>
      <div className="skeleton" style={{ aspectRatio: '2/3' }} />
      <div style={{ background: '#0E0C09', borderTop: '1px solid #1A1610', padding: '4px 8px', minHeight: 29 }} />
      <div style={{ background: '#0E0C09', borderTop: '2px solid #1A1610', padding: '10px' }}>
        <div className="skeleton" style={{ height: 28, borderRadius: 2 }} />
      </div>
    </div>
  )
}

export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  )
}

export function ShelfSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', gap: '1rem', overflow: 'hidden' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ width: 150, flexShrink: 0 }}><CardSkeleton /></div>
      ))}
    </div>
  )
}

export function RowSkeleton() {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div className="skeleton" style={{ width: 60, aspectRatio: '2/3', borderRadius: 2, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
        <div className="skeleton" style={{ height: 14, width: '55%', borderRadius: 2 }} />
        <div className="skeleton" style={{ height: 10, width: '30%', borderRadius: 2 }} />
      </div>
    </div>
  )
}

export function RowListSkeleton({ count = 5 }: { count?: number }) {
  return <div>{Array.from({ length: count }).map((_, i) => <RowSkeleton key={i} />)}</div>
}

// Wider row — matches the watched-history layout (bigger poster, more text)
export function WatchedRowSkeleton() {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--amber-dim)',
      borderRadius: 4, display: 'flex', gap: '1rem', padding: '0.75rem', alignItems: 'flex-start',
    }}>
      <div className="skeleton" style={{ width: 52, height: 78, flexShrink: 0, borderRadius: 2 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton" style={{ height: 14, width: '50%', borderRadius: 2 }} />
        <div className="skeleton" style={{ height: 11, width: '30%', borderRadius: 2 }} />
        <div className="skeleton" style={{ height: 11, width: '65%', borderRadius: 2 }} />
      </div>
    </div>
  )
}

export function WatchedListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {Array.from({ length: count }).map((_, i) => <WatchedRowSkeleton key={i} />)}
    </div>
  )
}
