'use client'
import { useState, useEffect } from 'react'
import { Archive } from 'lucide-react'
import Image from 'next/image'
import { posterUrl } from '@/lib/utils'

interface WatchedMovie {
  id: string; tmdb_id: number; title: string; poster_path: string | null
  user_rating: number | null; what_worked: string[]; notes: string | null
  watched_at: string; runtime: number | null
}
interface SeasonRating {
  season_number: number; user_rating: number | null; what_worked: string[]
}
interface WatchedShow {
  id: string; tmdb_id: number; title: string; poster_path: string | null
  status: string; updated_at: string; season_ratings: SeasonRating[]
}

const RATING_LABELS: Record<number, string> = { 1:'Skip It', 2:'Meh', 3:'Decent', 4:'Liked It', 5:'Masterpiece' }

function Stars({ n }: { n: number | null }) {
  if (!n) return <span style={{ color: 'var(--cream-dim)', fontSize: 11 }}>—</span>
  return (
    <span>
      <span style={{ color: 'var(--amber)' }}>{'★'.repeat(n)}{'☆'.repeat(5-n)}</span>
      <span style={{ color: 'var(--cream-dim)', fontSize: 11, marginLeft: 4 }}>{RATING_LABELS[n]}</span>
    </span>
  )
}

export default function WatchedPage() {
  const [movies, setMovies]     = useState<WatchedMovie[]>([])
  const [shows, setShows]       = useState<WatchedShow[]>([])
  const [tab, setTab]           = useState<'movies' | 'shows'>('movies')
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    fetch('/api/watched')
      .then(r => r.json())
      .then(d => { setMovies(d.movies ?? []); setShows(d.shows ?? []) })
      .finally(() => setLoading(false))
  }, [])

  const rowStyle: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--amber-dim)',
    borderRadius: 4, display: 'flex', gap: '1rem', padding: '0.75rem', alignItems: 'flex-start',
  }
  const posterStyle: React.CSSProperties = {
    width: 52, height: 78, flexShrink: 0, position: 'relative',
    background: 'var(--bg)', borderRadius: 2, overflow: 'hidden',
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem' }}>
        <Archive size={18} color="var(--amber)" />
        <h1 style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 20, margin: 0, letterSpacing: 2 }}>WATCHED HISTORY</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', marginBottom: '1.5rem', border: '1px solid var(--amber-dim)', borderRadius: 2, overflow: 'hidden', width: 'fit-content' }}>
        {(['movies','shows'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            fontFamily: 'var(--font-mono)', fontSize: 12, padding: '0.5rem 1.25rem',
            background: tab === t ? 'var(--amber)' : 'transparent',
            color: tab === t ? 'var(--bg)' : 'var(--cream-dim)',
            border: 'none', cursor: 'pointer',
          }}>
            {t === 'movies' ? `▶ MOVIES (${movies.length})` : `▣ SHOWS (${shows.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 13 }}>LOADING...</div>
      ) : tab === 'movies' ? (
        movies.length === 0
          ? <p style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-mono)', color: 'var(--cream-dim)', fontSize: 13 }}>NO MOVIES YET.</p>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {movies.map(m => (
                <div key={m.id} style={rowStyle}>
                  <div style={posterStyle}>
                    {m.poster_path ? <Image src={posterUrl(m.poster_path)!} alt={m.title} fill style={{ objectFit: 'cover' }} /> : null}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--cream)', fontWeight: 700, fontSize: 14 }}>{m.title}</span>
                      <span style={{ color: 'var(--cream-dim)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                        {new Date(m.watched_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ marginTop: 4 }}><Stars n={m.user_rating} /></div>
                    {m.what_worked?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                        {m.what_worked.map(w => (
                          <span key={w} style={{
                            background: 'rgba(192,120,24,0.15)', color: 'var(--amber)',
                            border: '1px solid var(--amber-dim)', fontSize: 10,
                            padding: '0.15rem 0.5rem', borderRadius: 2, fontFamily: 'var(--font-mono)',
                          }}>{w}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
      ) : (
        shows.length === 0
          ? <p style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-mono)', color: 'var(--cream-dim)', fontSize: 13 }}>NO SHOWS YET.</p>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {shows.map(s => (
                <div key={s.id} style={rowStyle}>
                  <div style={posterStyle}>
                    {s.poster_path ? <Image src={posterUrl(s.poster_path)!} alt={s.title} fill style={{ objectFit: 'cover' }} /> : null}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--cream)', fontWeight: 700, fontSize: 14 }}>{s.title}</span>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 10, padding: '0.15rem 0.5rem', borderRadius: 2,
                        background: s.status==='watching' ? 'rgba(192,120,24,0.2)' : s.status==='finished' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                        color: s.status==='watching' ? 'var(--amber)' : s.status==='finished' ? '#4ade80' : '#f87171',
                        border: `1px solid ${s.status==='watching' ? 'var(--amber-dim)' : s.status==='finished' ? '#4ade80' : '#f87171'}`,
                      }}>{s.status.toUpperCase()}</span>
                    </div>
                    {s.season_ratings?.length > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {[...s.season_ratings].sort((a,b) => a.season_number - b.season_number).map(sr => (
                          <div key={sr.season_number} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)', minWidth: 40 }}>S{sr.season_number}</span>
                            <Stars n={sr.user_rating} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
      )}
    </div>
  )
}
