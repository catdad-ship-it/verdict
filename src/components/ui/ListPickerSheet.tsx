'use client'
import { X } from 'lucide-react'

interface UserList { id: string; name: string }

interface ListPickerSheetProps {
  lists: UserList[]
  onPick: (listId: 'queue' | string) => void
  onClose: () => void
}

export default function ListPickerSheet({ lists, onPick, onClose }: ListPickerSheetProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 200, backdropFilter: 'blur(2px)',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 201,
        background: 'var(--surface)', borderTop: '2px solid var(--amber-dim)',
        borderRadius: '12px 12px 0 0', padding: '1.25rem 1rem 2rem',
        maxHeight: '60vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', letterSpacing: 3 }}>
            ADD TO...
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Queue (always first) */}
          <button
            onClick={() => onPick('queue')}
            style={{
              width: '100%', textAlign: 'left', padding: '0.875rem 1rem',
              background: 'var(--raised)', border: '1px solid var(--border)',
              borderRadius: 4, cursor: 'pointer', color: 'var(--cream)',
              fontFamily: 'var(--font-mono)', fontSize: 13, letterSpacing: 1,
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--amber)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            MY QUEUE
          </button>

          {/* Custom lists */}
          {lists.map(l => (
            <button
              key={l.id}
              onClick={() => onPick(l.id)}
              style={{
                width: '100%', textAlign: 'left', padding: '0.875rem 1rem',
                background: 'var(--raised)', border: '1px solid var(--border)',
                borderRadius: 4, cursor: 'pointer', color: 'var(--cream)',
                fontFamily: 'var(--font-mono)', fontSize: 13, letterSpacing: 1,
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--amber)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              {l.name.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
