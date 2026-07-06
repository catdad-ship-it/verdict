'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings as SettingsIcon, Check, Film, Sparkles, ListOrdered, User, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { TMDB_GENRES, MOVIE_GENRE_IDS } from '@/lib/types'

interface ServiceOption { id: number; name: string; logoPath: string | null }

const SHELVES: { key: string; label: string }[] = [
  { key: 'now_playing',      label: 'NOW PLAYING' },
  { key: 'coming_soon',      label: 'COMING SOON' },
  { key: 'new_to_streaming', label: 'NEW TO STREAMING' },
]

const SORT_OPTIONS: { key: string; label: string }[] = [
  { key: 'added',   label: 'DATE ADDED' },
  { key: 'title',   label: 'TITLE (A–Z)' },
  { key: 'runtime', label: 'RUNTIME' },
  { key: 'year',    label: 'YEAR' },
  { key: 'rating',  label: 'RATING' },
]

type GenreState = 'preferred' | 'excluded' | null

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
      {icon}
      <h2 style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 14, margin: 0, letterSpacing: 2 }}>{title}</h2>
    </div>
  )
}

// These prefs auto-save on toggle (no separate SAVE button) — this just
// gives quiet feedback that the tap actually persisted.
function SaveStatus({ saving, saved }: { saving: boolean; saved: boolean }) {
  if (!saving && !saved) return null
  return (
    <div style={{ marginTop: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1, color: 'var(--amber)' }}>
      {saving ? 'SAVING...' : '✓ SAVED'}
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()

  // Streaming services
  const [services, setServices] = useState<ServiceOption[]>([])
  const [selectedServices, setSelectedServices] = useState<Set<number>>(new Set())
  const [savingServices, setSavingServices] = useState(false)
  const [savedServices, setSavedServices]   = useState(false)

  // New Releases shelves
  const [hiddenShelves, setHiddenShelves] = useState<Set<string>>(new Set())
  const [savingShelves, setSavingShelves] = useState(false)
  const [savedShelves, setSavedShelves]   = useState(false)

  // Suggestions genre tuning
  const [genreStates, setGenreStates] = useState<Record<number, GenreState>>({})
  const [savingGenres, setSavingGenres] = useState(false)
  const [savedGenres, setSavedGenres]   = useState(false)

  // Queue default sort
  const [defaultSort, setDefaultSort] = useState('added')
  const [savingSort, setSavingSort] = useState(false)
  const [savedSort, setSavedSort]   = useState(false)

  // Account
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSaved, setPasswordSaved]   = useState(false)
  const [passwordError, setPasswordError]   = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/settings/streaming-services').then(r => r.json()),
      fetch('/api/settings/preferences').then(r => r.json()),
    ]).then(([svc, prefs]: [
      { services: ServiceOption[]; selected: number[] },
      { hiddenShelves: string[]; defaultQueueSort: string; preferredGenreIds: number[]; excludedGenreIds: number[] },
    ]) => {
      setServices(svc.services ?? [])
      setSelectedServices(new Set(svc.selected ?? []))
      setHiddenShelves(new Set(prefs.hiddenShelves ?? []))
      setDefaultSort(prefs.defaultQueueSort ?? 'added')
      const states: Record<number, GenreState> = {}
      for (const id of prefs.preferredGenreIds ?? []) states[id] = 'preferred'
      for (const id of prefs.excludedGenreIds ?? []) states[id] = 'excluded'
      setGenreStates(states)
    }).finally(() => setLoading(false))

    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''))
  }, [])

  const saveServices = async (ids: Set<number>) => {
    setSavingServices(true)
    setSavedServices(false)
    try {
      await fetch('/api/settings/streaming-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerIds: Array.from(ids) }),
      })
      setSavedServices(true)
    } finally {
      setSavingServices(false)
    }
  }

  const toggleService = (id: number) => {
    const next = new Set(selectedServices)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedServices(next)
    saveServices(next)
  }

  const saveShelves = async (hidden: Set<string>) => {
    setSavingShelves(true)
    setSavedShelves(false)
    try {
      await fetch('/api/settings/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hiddenShelves: Array.from(hidden) }),
      })
      setSavedShelves(true)
    } finally {
      setSavingShelves(false)
    }
  }

  const toggleShelf = (key: string) => {
    const next = new Set(hiddenShelves)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setHiddenShelves(next)
    saveShelves(next)
  }

  const saveGenres = async (states: Record<number, GenreState>) => {
    setSavingGenres(true)
    setSavedGenres(false)
    try {
      const preferredGenreIds = Object.entries(states).filter(([, v]) => v === 'preferred').map(([id]) => Number(id))
      const excludedGenreIds  = Object.entries(states).filter(([, v]) => v === 'excluded').map(([id]) => Number(id))
      await fetch('/api/settings/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredGenreIds, excludedGenreIds }),
      })
      setSavedGenres(true)
    } finally {
      setSavingGenres(false)
    }
  }

  const cycleGenre = (id: number) => {
    const current = genreStates[id] ?? null
    const nextState: GenreState = current === null ? 'preferred' : current === 'preferred' ? 'excluded' : null
    const next = { ...genreStates, [id]: nextState }
    setGenreStates(next)
    saveGenres(next)
  }

  const saveSort = async (sortKey: string) => {
    setSavingSort(true)
    setSavedSort(false)
    try {
      await fetch('/api/settings/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultQueueSort: sortKey }),
      })
      setSavedSort(true)
    } finally {
      setSavingSort(false)
    }
  }

  const changePassword = async () => {
    setPasswordError(null)
    setPasswordSaved(false)
    if (newPassword.length < 6) { setPasswordError('Password must be at least 6 characters.'); return }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords don’t match.'); return }
    setPasswordSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) setPasswordError(error.message)
      else {
        setPasswordSaved(true)
        setNewPassword('')
        setConfirmPassword('')
      }
    } finally {
      setPasswordSaving(false)
    }
  }

  const signOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 3, color: 'var(--cream)', fontFamily: 'var(--font-mono)',
    fontSize: 16, padding: '0.5rem 0.7rem', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '1.5rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.5rem' }}>
        <SettingsIcon size={18} color="var(--amber)" />
        <h1 style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 20, margin: 0, letterSpacing: 2 }}>SETTINGS</h1>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 13 }}>LOADING...</div>
      ) : (
        <>
          {/* ── Streaming services ── */}
          <section style={{ marginBottom: '2.5rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
            <SectionHeader icon={<Film size={15} color="var(--amber)" />} title="STREAMING SERVICES" />
            <p style={{ color: 'var(--cream-dim)', fontSize: 12, marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
              Tell us what you&apos;re subscribed to and we&apos;ll show you exactly where to watch — on your services, or where to rent/buy if you don&apos;t have it.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
              {services.map(s => {
                const isSelected = selectedServices.has(s.id)
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleService(s.id)}
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
            <SaveStatus saving={savingServices} saved={savedServices} />
          </section>

          {/* ── New Releases shelves ── */}
          <section style={{ marginBottom: '2.5rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
            <SectionHeader icon={<Film size={15} color="var(--amber)" />} title="NEW RELEASES" />
            <p style={{ color: 'var(--cream-dim)', fontSize: 12, marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
              Turn off any shelf you don&apos;t want cluttering the New Releases page.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SHELVES.map(shelf => {
                const isOn = !hiddenShelves.has(shelf.key)
                return (
                  <button
                    key={shelf.key}
                    onClick={() => toggleShelf(shelf.key)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.65rem 0.9rem', borderRadius: 3, cursor: 'pointer',
                      background: 'var(--raised)', border: '1px solid var(--border)',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: 0.5, color: isOn ? 'var(--cream)' : 'var(--cream-dim)' }}>
                      {shelf.label}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1, fontWeight: 700,
                      color: isOn ? 'var(--amber)' : 'var(--cream-dim)',
                      border: `1px solid ${isOn ? 'var(--amber)' : 'var(--border)'}`,
                      borderRadius: 2, padding: '2px 8px',
                    }}>
                      {isOn ? 'ON' : 'OFF'}
                    </span>
                  </button>
                )
              })}
            </div>
            <SaveStatus saving={savingShelves} saved={savedShelves} />
          </section>

          {/* ── Suggestions genre tuning ── */}
          <section id="genre-tuning" style={{ marginBottom: '2.5rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
            <SectionHeader icon={<Sparkles size={15} color="var(--amber)" />} title="SUGGESTIONS" />
            <p style={{ color: 'var(--cream-dim)', fontSize: 12, marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
              Tap a genre to boost it, tap again to hide it entirely, tap once more to clear.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {MOVIE_GENRE_IDS.map(id => {
                const state = genreStates[id] ?? null
                const color = state === 'preferred' ? 'var(--amber)' : state === 'excluded' ? '#E08070' : 'var(--cream-dim)'
                const border = state === 'preferred' ? 'var(--amber)' : state === 'excluded' ? '#9A3028' : 'var(--border)'
                const bg = state === 'preferred' ? 'rgba(192,120,24,0.12)' : state === 'excluded' ? 'rgba(154,48,40,0.15)' : 'var(--raised)'
                return (
                  <button
                    key={id}
                    onClick={() => cycleGenre(id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '0.4rem 0.75rem', borderRadius: 20, cursor: 'pointer',
                      background: bg, border: `1px solid ${border}`,
                      fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 0.3, color,
                    }}
                  >
                    {state === 'preferred' && <span>+</span>}
                    {state === 'excluded' && <span>−</span>}
                    {TMDB_GENRES[id]}
                  </button>
                )
              })}
            </div>
            <SaveStatus saving={savingGenres} saved={savedGenres} />
          </section>

          {/* ── Queue default sort ── */}
          <section style={{ marginBottom: '2.5rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
            <SectionHeader icon={<ListOrdered size={15} color="var(--amber)" />} title="QUEUE" />
            <p style={{ color: 'var(--cream-dim)', fontSize: 12, marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
              How your queue is sorted by default when you open it.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { setDefaultSort(opt.key); saveSort(opt.key) }}
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11, padding: '0.4rem 0.8rem',
                    background: defaultSort === opt.key ? 'var(--amber)' : 'transparent',
                    color: defaultSort === opt.key ? 'var(--bg)' : 'var(--cream-dim)',
                    border: '1px solid var(--amber-dim)', borderRadius: 2, cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <SaveStatus saving={savingSort} saved={savedSort} />
          </section>

          {/* ── Account ── */}
          <section>
            <SectionHeader icon={<User size={15} color="var(--amber)" />} title="ACCOUNT" />
            <p style={{ color: 'var(--cream-dim)', fontSize: 12, marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
              Signed in as {email || '...'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 340, marginBottom: '1rem' }}>
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setPasswordSaved(false); setPasswordError(null) }}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--amber)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setPasswordSaved(false); setPasswordError(null) }}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--amber)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            {passwordError && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#E08070', marginBottom: '0.75rem' }}>{passwordError}</p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem' }}>
              <button
                onClick={changePassword}
                disabled={passwordSaving || !newPassword}
                className="vcr-btn-primary"
                style={{ fontSize: 11, padding: '0.5rem 1.3rem', opacity: (passwordSaving || !newPassword) ? 0.6 : 1 }}
              >
                {passwordSaving ? 'SAVING...' : 'CHANGE PASSWORD'}
              </button>
              {passwordSaved && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', letterSpacing: 1 }}>✓ UPDATED</span>
              )}
            </div>

            <button
              onClick={signOut}
              disabled={signingOut}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: '1px solid var(--border)', borderRadius: 3,
                color: 'var(--cream-dim)', cursor: 'pointer', fontFamily: 'var(--font-mono)',
                fontSize: 11, letterSpacing: 1, padding: '0.5rem 1rem', opacity: signingOut ? 0.6 : 1,
              }}
            >
              <LogOut size={13} /> {signingOut ? 'SIGNING OUT...' : 'SIGN OUT'}
            </button>
          </section>
        </>
      )}
    </div>
  )
}
