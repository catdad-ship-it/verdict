'use client'
import type { ReactNode } from 'react'
import { CheckSquare, Square } from 'lucide-react'

// The "SELECT" header toggle — duplicated (with one padding difference)
// between Home and Watched.
export function SelectModeToggle({
  active, onClick, title, compact,
}: {
  active: boolean; onClick: () => void; title?: string; compact?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title ?? (active ? 'Exit select mode' : 'Select multiple titles')}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontFamily: 'var(--font-mono)', fontSize: 11,
        padding: compact ? '0.2rem 0.5rem' : '0.4rem 0.7rem',
        background: active ? 'var(--amber)' : 'transparent',
        color: active ? 'var(--bg)' : 'var(--cream-dim)',
        border: '1px solid var(--amber-dim)', borderRadius: 2, cursor: 'pointer',
      }}
    >
      {active ? <CheckSquare size={11} /> : <Square size={11} />}
      SELECT
    </button>
  )
}

// The row of bulk-action buttons ("ADD TO LIST"/"REMOVE"/etc) shown to the
// left of CANCEL — a destructive (red) or default (amber) styled button
// that disables itself when nothing's selected.
export function BulkActionButton({
  label, onClick, disabled, variant = 'default',
}: {
  label: string; onClick: () => void; disabled?: boolean; variant?: 'default' | 'destructive'
}) {
  const colors = variant === 'destructive'
    ? { color: '#f87171', background: 'rgba(154,48,40,0.12)', border: '1px solid rgba(154,48,40,0.4)' }
    : { color: 'var(--amber)', background: 'rgba(192,120,24,0.1)', border: '1px solid var(--amber-dim)' }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1,
        ...colors, borderRadius: 2, padding: '0.4rem 0.75rem',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
      }}
    >{label}</button>
  )
}

// The full bulk-action bar — "N SELECTED" / SELECT ALL / (actions) / CANCEL
// — duplicated between Home and Watched. `children` are the bulk-action
// buttons specific to each page (Home has ADD TO LIST + REMOVE, Watched
// has just REMOVE).
export default function BulkActionBar({
  count, onSelectAll, onCancel, children,
}: {
  count: number; onSelectAll: () => void; onCancel: () => void; children: ReactNode
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      marginBottom: '1.25rem', padding: '0.6rem 0.75rem',
      background: 'var(--surface)', border: '1px solid var(--amber-dim)', borderRadius: 4,
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', letterSpacing: 1, whiteSpace: 'nowrap' }}>
        {count} SELECTED
      </span>
      <button
        onClick={onSelectAll}
        style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)',
          background: 'none', border: '1px solid var(--border)', borderRadius: 2,
          padding: '0.3rem 0.6rem', cursor: 'pointer',
        }}
      >SELECT ALL</button>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {children}
        <button
          onClick={onCancel}
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1,
            color: 'var(--cream-dim)', background: 'none',
            border: '1px solid var(--border)', borderRadius: 2,
            padding: '0.4rem 0.75rem', cursor: 'pointer',
          }}
        >CANCEL</button>
      </div>
    </div>
  )
}
