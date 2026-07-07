'use client'
import { useState, useRef, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import ModalShell from '@/components/ui/ModalShell'

interface UserList { id: string; name: string }

interface ListPickerSheetProps {
  lists: UserList[]
  onPick: (listId: 'queue' | string) => void
  onClose: () => void
  onListCreated?: (list: UserList) => void
}

export default function ListPickerSheet({ lists, onPick, onClose, onListCreated }: ListPickerSheetProps) {
  const [creatingNew, setCreatingNew] = useState(false)
  const [newName, setNewName]         = useState('')
  const [saving, setSaving]           = useState(false)
  const inputRef                      = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (creatingNew) inputRef.current?.focus()
  }, [creatingNew])

  const handleCreateAndAdd = async () => {
    const name = newName.trim()
    if (!name || saving) return
    setSaving(true)
    try {
      const res  = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const list = await res.json()
      if (list?.id) {
        onListCreated?.(list)
        onPick(list.id)
      }
    } finally {
      setSaving(false)
    }
  }

  const listRowStyle: React.CSSProperties = {
    width: '100%', textAlign: 'left', padding: '0.875rem 1rem',
    background: 'var(--raised)', border: '1px solid var(--border)',
    borderRadius: 4, cursor: 'pointer', color: 'var(--cream)',
    fontFamily: 'var(--font-mono)', fontSize: 13, letterSpacing: 1,
  }

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
      <ModalShell onClose={onClose} label="Add to list" style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 201,
        background: 'var(--surface)', borderTop: '2px solid var(--amber-dim)',
        borderRadius: '12px 12px 0 0', padding: '1.25rem 1rem 2rem',
        maxHeight: '65dvh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', letterSpacing: 3 }}>
            ADD TO...
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--cream-dim)', cursor: 'pointer', padding: 4 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Queue (always first) */}
          <button
            onClick={() => onPick('queue')}
            style={listRowStyle}
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
              style={listRowStyle}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--amber)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              {l.name.toUpperCase()}
            </button>
          ))}

          {/* New list row */}
          {creatingNew ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
              <input
                ref={inputRef}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateAndAdd()
                  if (e.key === 'Escape') { setCreatingNew(false); setNewName('') }
                }}
                placeholder="List name..."
                maxLength={40}
                style={{
                  flex: 1, padding: '0.875rem 1rem', borderRadius: 4,
                  background: 'var(--raised)', border: '1px solid var(--amber)',
                  color: 'var(--cream)', fontFamily: 'var(--font-mono)',
                  outline: 'none', fontSize: 16, // 16px prevents iOS zoom
                }}
              />
              <button
                onClick={handleCreateAndAdd}
                disabled={!newName.trim() || saving}
                style={{
                  padding: '0 1.25rem', borderRadius: 4, cursor: 'pointer',
                  background: 'var(--amber)', color: '#0A0800',
                  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                  border: 'none', letterSpacing: 1,
                  opacity: !newName.trim() || saving ? 0.4 : 1,
                }}
              >
                {saving ? '...' : 'CREATE'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreatingNew(true)}
              style={{
                ...listRowStyle,
                display: 'flex', alignItems: 'center', gap: 8,
                color: 'var(--amber)', borderStyle: 'dashed',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--amber)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <Plus size={14} /> NEW LIST
            </button>
          )}
        </div>
      </ModalShell>
    </>
  )
}
