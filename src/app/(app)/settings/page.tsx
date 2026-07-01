'use client'
import { useEffect, useState } from 'react'
import { Settings as SettingsIcon, Check } from 'lucide-react'

interface ServiceOption { id: number; name: string; logoPath: string | null }

export default function SettingsPage() {
  const [services, setServices] = useState<ServiceOption[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  useEffect(() => {
    fetch('/api/settings/streaming-services')
      .then(r => r.json())
      .then((d: { services: ServiceOption[]; selected: number[] }) => {
        setServices(d.services ?? [])
        setSelected(new Set(d.selected ?? []))
      })
      .finally(() => setLoading(false))
  }, [])

  const toggle = (id: number) => {
    setSaved(false)
    setSelected(s => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/settings/streaming-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerIds: Array.from(selected) }),
      })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '1.5rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.5rem' }}>
        <SettingsIcon size={18} color="var(--amber)" />
        <h1 style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 20, margin: 0, letterSpacing: 2 }}>SETTINGS</h1>
      </div>
      <p style={{ color: 'var(--cream-dim)', fontSize: 13, marginBottom: '1.5rem', fontFamily: 'var(--font-mono)' }}>
        Tell us what you&apos;re subscribed to and we&apos;ll show you exactly where to watch — on your services, or where to rent/buy if you don&apos;t have it.
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 13 }}>LOADING...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
            {services.map(s => {
              const isSelected = selected.has(s.id)
              return (
                <button
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '0.75rem 0.9rem', borderRadius: 3, cursor: 'pointer',
                    background: isSelected ? 'rgba(192,120,24,0.12)' : 'var(--raised)',
                    border: `1px solid ${isSelected ? 'var(--amber)' : 'var(--border)'}`,
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                >
                  {s.logoPath ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w45${s.logoPath}`}
                      alt={s.name}
                      style={{ width: 28, height: 28, borderRadius: 4, flexShrink: 0, objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: 4, flexShrink: 0, background: 'var(--border)' }} />
                  )}
                  <span style={{
                    flex: 1, textAlign: 'left', fontSize: 12, fontFamily: 'var(--font-mono)',
                    color: isSelected ? 'var(--amber)' : 'var(--cream)', letterSpacing: 0.3,
                  }}>
                    {s.name}
                  </span>
                  {isSelected && <Check size={14} color="var(--amber)" style={{ flexShrink: 0 }} />}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={save}
              disabled={saving}
              className="vcr-btn-primary"
              style={{ fontSize: 12, padding: '0.6rem 1.5rem', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'SAVING...' : 'SAVE'}
            </button>
            {saved && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', letterSpacing: 1 }}>
                ✓ SAVED
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
