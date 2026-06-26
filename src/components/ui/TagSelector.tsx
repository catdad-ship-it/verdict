'use client'

interface TagSelectorProps {
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  max?: number
}

export default function TagSelector({ options, selected, onChange, max }: TagSelectorProps) {
  const toggle = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag))
    } else {
      if (max && selected.length >= max) return
      onChange([...selected, tag])
    }
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {options.map((tag) => {
        const active = selected.includes(tag)
        return (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontSize: '12px',
              fontWeight: 500,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              padding: '10px 12px',
              borderRadius: '3px',
              border: `1px solid ${active ? 'var(--amber)' : 'var(--border)'}`,
              background: active ? 'var(--amber-glow)' : 'var(--surface)',
              color: active ? 'var(--amber)' : 'var(--cream-dim)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {tag}
          </button>
        )
      })}
    </div>
  )
}
