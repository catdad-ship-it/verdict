'use client'
import { useState, useEffect } from 'react'
import { Archive, RefreshCw, CheckSquare, Square, Check } from 'lucide-react'
import Image from 'next/image'
import { posterUrl } from '@/lib/utils'
import PostWatchModal from '@/components/modals/PostWatchModal'
import { WatchedListSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import type { PostWatchAnswers } from '@/lib/types'

interface WatchedMovie {
  id: string; tmdb_id: number; title: string; poster_path: string | null
  user_rating: number | null; what_worked: string[]; notes: string | null
  watched_at: string; runtime: number | null; is_rewatch?: boolean
}
interface SeasonRating { season_number: number; user_rating: number | null; what_worked: string[] }
interface WatchedShow {
  id: string; tmdb_id: number; title: string; poster_path: string | null
  status: string; updated_at: string; season_ratings: SeasonRating[]
}
interface ReplayTarget {
  tmdbId: number; title: string; posterPath: string | null; runtime: number | null
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
  const toast = useToast()
  const [movies, setMovies]       = useState<WatchedMovie[]>([])
  const [shows, setShows]         = useState<WatchedShow[]>([])
  const [tab, setTab]             = useState<'movies' | 'shows'>('movies')
  const [loading, setLoading]     = useState(true)
  const [replayTarget, setReplayTarget] = useState<ReplayTarget | null>(null)
  const [expandedId, setExpandedId]     = useState<number | null>(null)

  // Multi-select bulk delete — movies select by tmdb_id (clears every
  // rewatch row for that title), shows select by their own row id.
  const [selectMode, setSelectMode]         = useState(false)
  const [selectedMovies, setSelectedMovies] = useState<Set<number>>(new Set())
  const [selectedShows, setSelectedShows]   = useState<Set<string>>(new Set())

  // loading defaults to true, so the initial mount fetch already shows the
  // skeleton without setting it here — the refetch after a rewatch save
  // intentionally doesn't flip it back on, so the list updates in place
  // instead of flashing the skeleton over content already on screen.
  const loadData = () => {
    fetch('/api/watched')
      .then(r => r.json())
      .then(d => { setMovies(d.movies ?? []); setShows(d.shows ?? []) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const handleRewatch = async (answers: PostWatchAnswers) => {
    if (!replayTarget) return
    await fetch('/api/watched', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type:  'movie',
        tmdb_id:     replayTarget.tmdbId,
        title:       replayTarget.title,
        poster_path: replayTarget.posterPath,
        runtime:     replayTarget.runtime,
        user_rating: answers.userRating,
        what_worked: answers.whatWorked,
        want_more:   answers.wantMoreLikeThis,
        notes:       answers.notes ?? null,
        is_rewatch:  true,
      }),
    })
    setReplayTarget(null)
    loadData()
  }

  // Group movies by tmdb_id, sort each group newest-first
  const movieGroups = Object.values(
    movies.reduce<Record<number, WatchedMovie[]>>((acc, m) => {
      acc[m.tmdb_id] = acc[m.tmdb_id] ?? []
      acc[m.tmdb_id].push(m)
      return acc
    }, {})
  ).map(group => group.sort((a,b) => new Date(b.watched_at).getTime() - new Date(a.watched_at).getTime()))
   .sort((a,b) => new Date(b[0].watched_at).getTime() - new Date(a[0].watched_at).getTime())

  const toggleSelectMode = () => {
    setSelectMode(m => !m)
    setSelectedMovies(new Set())
    setSelectedShows(new Set())
  }

  const toggleMovieSelect = (tmdbId: number) => {
    setSelectedMovies(s => {
      const next = new Set(s)
      if (next.has(tmdbId)) next.delete(tmdbId)
      else next.add(tmdbId)
      return next
    })
  }

  const toggleShowSelect = (id: string) => {
    setSelectedShows(s => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllVisible = () => {
    if (tab === 'movies') setSelectedMovies(new Set(movieGroups.map(g => g[0].tmdb_id)))
    else setSelectedShows(new Set(shows.map(s => s.id)))
  }

  const selectedCount = tab === 'movies' ? selectedMovies.size : selectedShows.size

  const handleBulkDelete = () => {
    if (tab === 'movies') {
      if (selectedMovies.size === 0) return
      const toDelete = movies.filter(m => selectedMovies.has(m.tmdb_id))
      const ids = toDelete.map(m => m.id)
      const count = selectedMovies.size
      setMovies(ms => ms.filter(m => !ids.includes(m.id)))
      toast.showUndo(`Removed ${count} title${count > 1 ? 's' : ''} from watched history`, () => {
        fetch('/api/watched', {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ movieIds: ids }),
        })
      }, { onUndo: () => setMovies(ms => [...toDelete, ...ms]) })
    } else {
      if (selectedShows.size === 0) return
      const toDelete = shows.filter(s => selectedShows.has(s.id))
      const ids = toDelete.map(s => s.id)
      const count = selectedShows.size
      setShows(ss => ss.filter(s => !ids.includes(s.id)))
      toast.showUndo(`Removed ${count} show${count > 1 ? 's' : ''} from watched history`, () => {
        fetch('/api/watched', {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ showIds: ids }),
        })
      }, { onUndo: () => setShows(ss => [...toDelete, ...ss]) })
    }
    setSelectedMovies(new Set())
    setSelectedShows(new Set())
    setSelectMode(false)
  }

  const rowStyle: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--amber-dim)',
    borderRadius: 4, display: 'flex', gap: '1rem', padding: '0.75rem', alignItems: 'flex-start',
  }
  const posterStyle: React.CSSProperties = {
    width: 52, height: 78, flexShrink: 0, position: 'relative',
    background: 'var(--bg)', borderRadius: 2, overflow: 'hidden',
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem' }}>
        <Archive size={18} color="var(--amber)" />
        <h1 style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 20, margin: 0, letterSpacing: 2 }}>WATCHED HISTORY</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', border: '1px solid var(--amber-dim)', borderRadius: 2, overflow: 'hidden', width: 'fit-content' }}>
          {(['movies','shows'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setSelectMode(false); setSelectedMovies(new Set()); setSelectedShows(new Set()) }} style={{
              fontFamily: 'var(--font-mono)', fontSize: 12, padding: '0.5rem 1.25rem',
              background: tab === t ? 'var(--amber)' : 'transparent',
              color: tab === t ? 'var(--bg)' : 'var(--cream-dim)',
              border: 'none', cursor: 'pointer',
            }}>
              {t === 'movies' ? `▶ MOVIES (${movieGroups.length})` : `▣ SHOWS (${shows.length})`}
            </button>
          ))}
        </div>
        {((tab === 'movies' && movieGroups.length > 0) || (tab === 'shows' && shows.length > 0)) && (
          <button
            onClick={toggleSelectMode}
            title={selectMode ? 'Exit select mode' : 'Select multiple entries'}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: 'var(--font-mono)', fontSize: 11, padding: '0.4rem 0.7rem',
              background: selectMode ? 'var(--amber)' : 'transparent',
              color: selectMode ? 'var(--bg)' : 'var(--cream-dim)',
              border: '1px solid var(--amber-dim)', borderRadius: 2, cursor: 'pointer',
            }}
          >
            {selectMode ? <CheckSquare size={11} /> : <Square size={11} />}
            SELECT
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {selectMode && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          marginBottom: '1.25rem', padding: '0.6rem 0.75rem',
          background: 'var(--surface)', border: '1px solid var(--amber-dim)', borderRadius: 4,
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', letterSpacing: 1, whiteSpace: 'nowrap' }}>
            {selectedCount} SELECTED
          </span>
          <button
            onClick={selectAllVisible}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)',
              background: 'none', border: '1px solid var(--border)', borderRadius: 2,
              padding: '0.3rem 0.6rem', cursor: 'pointer',
            }}
          >SELECT ALL</button>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={handleBulkDelete}
              disabled={selectedCount === 0}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1,
                color: '#f87171', background: 'rgba(154,48,40,0.12)',
                border: '1px solid rgba(154,48,40,0.4)', borderRadius: 2,
                padding: '0.4rem 0.75rem', cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
                opacity: selectedCount === 0 ? 0.4 : 1,
              }}
            >REMOVE</button>
            <button
              onClick={toggleSelectMode}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1,
                color: 'var(--cream-dim)', background: 'none',
                border: '1px solid var(--border)', borderRadius: 2,
                padding: '0.4rem 0.75rem', cursor: 'pointer',
              }}
            >CANCEL</button>
          </div>
        </div>
      )}

      {loading ? (
        <WatchedListSkeleton count={5} />
      ) : tab === 'movies' ? (
        movieGroups.length === 0
          ? <EmptyState title="NO MOVIES YET" subtitle="Mark a movie watched and it'll show up here." />
          : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {movieGroups.map(group => {
                const latest     = group[0]
                const watchCount = group.length
                const isExpanded = expandedId === latest.tmdb_id
                const isSelected = selectedMovies.has(latest.tmdb_id)
                return (
                  <div
                    key={latest.tmdb_id}
                    style={{ ...rowStyle, cursor: selectMode ? 'pointer' : undefined }}
                    onClick={selectMode ? () => toggleMovieSelect(latest.tmdb_id) : undefined}
                  >
                    {selectMode && (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 22, height: 22, flexShrink: 0, marginTop: 2,
                        border: `1px solid ${isSelected ? 'var(--amber)' : 'var(--border)'}`,
                        background: isSelected ? 'var(--amber)' : 'transparent',
                        borderRadius: 3,
                      }}>
                        {isSelected && <Check size={13} color="var(--bg)" />}
                      </div>
                    )}
                    <div style={posterStyle}>
                      {latest.poster_path && <Image src={posterUrl(latest.poster_path)!} alt={latest.title} fill style={{ objectFit: 'cover' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Title row */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--cream)', fontWeight: 700, fontSize: 14 }}>{latest.title}</span>
                        <span style={{ color: 'var(--cream-dim)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                          {new Date(latest.watched_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        {watchCount > 1 && (
                          <span
                            onClick={e => { if (selectMode) return; e.stopPropagation(); setExpandedId(isExpanded ? null : latest.tmdb_id) }}
                            style={{
                              fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1,
                              color: 'var(--amber)', background: 'rgba(192,120,24,0.15)',
                              border: '1px solid rgba(192,120,24,0.4)',
                              borderRadius: 2, padding: '1px 5px', cursor: 'pointer',
                            }}
                          >
                            🔁 {watchCount}×
                          </span>
                        )}
                      </div>

                      {/* Rating */}
                      <div style={{ marginTop: 4 }}><Stars n={latest.user_rating} /></div>

                      {/* Tags */}
                      {latest.what_worked?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                          {latest.what_worked.map(w => (
                            <span key={w} style={{
                              background: 'rgba(192,120,24,0.15)', color: 'var(--amber)',
                              border: '1px solid var(--amber-dim)', fontSize: 11,
                              padding: '0.15rem 0.5rem', borderRadius: 2, fontFamily: 'var(--font-mono)',
                            }}>{w}</span>
                          ))}
                        </div>
                      )}

                      {/* Notes */}
                      {latest.notes && (
                        <p style={{ fontSize: 11, color: 'var(--cream-dim)', marginTop: 6, fontStyle: 'italic', lineHeight: 1.5 }}>
                          &quot;{latest.notes}&quot;
                        </p>
                      )}

                      {/* Rewatch history (expanded) */}
                      {isExpanded && watchCount > 1 && (
                        <div style={{
                          marginTop: 10, paddingTop: 10,
                          borderTop: '1px solid var(--border)',
                          display: 'flex', flexDirection: 'column', gap: 6,
                        }}>
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)', letterSpacing: 1, marginBottom: 2 }}>WATCH HISTORY</p>
                          {group.map((w, i) => (
                            <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)', minWidth: 70 }}>
                                {new Date(w.watched_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                              </span>
                              <Stars n={w.user_rating} />
                              {i === 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)' }}>LATEST</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Rewatch button — hidden in select mode */}
                      {!selectMode && (
                        <button
                          onClick={e => { e.stopPropagation(); setReplayTarget({ tmdbId: latest.tmdb_id, title: latest.title, posterPath: latest.poster_path, runtime: latest.runtime }) }}
                          style={{
                            marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5,
                            background: 'none', border: '1px solid var(--border)', borderRadius: 2,
                            color: 'var(--cream-dim)', cursor: 'pointer', fontFamily: 'var(--font-mono)',
                            fontSize: 11, letterSpacing: 1, padding: '4px 8px',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--amber)'; e.currentTarget.style.color = 'var(--amber)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--cream-dim)' }}
                        >
                          <RefreshCw size={9} /> REWATCH
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
      ) : (
        shows.length === 0
          ? <EmptyState title="NO SHOWS YET" subtitle="Mark a show watched and it'll show up here." />
          : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {shows.map(s => {
                const isSelected = selectedShows.has(s.id)
                return (
                <div
                  key={s.id}
                  style={{ ...rowStyle, cursor: selectMode ? 'pointer' : undefined }}
                  onClick={selectMode ? () => toggleShowSelect(s.id) : undefined}
                >
                  {selectMode && (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 22, height: 22, flexShrink: 0, marginTop: 2,
                      border: `1px solid ${isSelected ? 'var(--amber)' : 'var(--border)'}`,
                      background: isSelected ? 'var(--amber)' : 'transparent',
                      borderRadius: 3,
                    }}>
                      {isSelected && <Check size={13} color="var(--bg)" />}
                    </div>
                  )}
                  <div style={posterStyle}>
                    {s.poster_path && <Image src={posterUrl(s.poster_path)!} alt={s.title} fill style={{ objectFit: 'cover' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--cream)', fontWeight: 700, fontSize: 14 }}>{s.title}</span>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11, padding: '0.15rem 0.5rem', borderRadius: 2,
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
              )})}
            </div>
      )}

      {/* Rewatch modal */}
      {replayTarget && (
        <PostWatchModal
          title={replayTarget.title}
          mediaType="movie"
          runtime={replayTarget.runtime ?? undefined}
          isRewatch
          onSave={handleRewatch}
          onClose={() => setReplayTarget(null)}
        />
      )}
    </div>
  )
}
