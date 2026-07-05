'use client'
import type { CSSProperties } from 'react'

interface Props<T extends string> {
  label?: string
  options: readonly (readonly [T, string])[]
  active: T
  onChange: (value: T) => void
  // SearchAddModal's chips run smaller than Suggestions'/Home's.
  compact?: boolean
  style?: CSSProperties
}

// The "LABEL: [chip] [chip] [chip]" outline-filter row — tripled verbatim
// across Suggestions (decade/runtime/rating), SearchAddModal
// (decade/rating), and Home's queue sort row.
export default function FilterChips<T extends string>({
  label, options, active, onChange, compact, style,
}: Props<T>) {
  return (
    <div style={{ display: 'flex', gap: compact ? 5 : 6, alignItems: 'center', flexWrap: 'wrap', ...style }}>
      {label && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)' }}>{label}</span>}
      {options.map(([value, text]) => (
        <button key={value} onClick={() => onChange(value)} style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          padding: compact ? '0.15rem 0.4rem' : '0.2rem 0.5rem',
          background: active === value ? 'var(--amber-dim)' : 'transparent',
          color: active === value ? 'var(--amber)' : 'var(--cream-dim)',
          border: '1px solid var(--amber-dim)', borderRadius: 2, cursor: 'pointer',
        }}>{text}</button>
      ))}
    </div>
  )
}
