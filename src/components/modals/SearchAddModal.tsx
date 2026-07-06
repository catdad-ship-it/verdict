'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Search, Plus, Tv, ChevronLeft, User } from 'lucide-react'
import { posterUrl } from '@/lib/utils'
import type { PersonResult, PersonCreditItem } from '@/lib/tmdb'
import FilterChips from '@/components/ui/FilterChips'
import ModalShell from '@/components/ui/ModalShell'
import Image from 'next/image'

interface SearchResult {
  tmdbId: number
  title: string
  releaseYear?: string
  posterPath: string | null
  overview?: string
  runtime?: number
  genres?: number[]
  imdbRating?: number | null
  rtScore?: number | null
  mediaType?: 'movie' | 'tv'
}

interface RawSearchItem {
  id: number
  title: string
  releaseYear?: string
  posterPath: string | null
  overview?: string
  runtime?: number
  genreIds?: number[]
  imdbRating?: number | null
  rtScore?: number | null
}

type Tab = 'movie' | 'show' | 'people'
type DecadeFilter = 'all' | '2020s' | '2010s' | '2000s' | 'older'
type RatingFilter = 'all' | 'high'

interface Props {
  onClose: () => void
  onAdd: (item: SearchResult & { mediaType: 'movie' | 'tv' }) => Promise<void>
  // The list/queue the picker flow already chose as the add destination —
  // shown in the header instead of an always-"QUEUE" label that lies once
  // the user picked a named list.
  destinationLabel?: string
}

export default function SearchAddModal({ onClose, onAdd, destinationLabel = 'QUEUE' }: Props) {
  const [query, setQuery]     = useState('')
  const [tab, setTab]         = useState<Tab>('movie')
  const [results, setResults] = useState<SearchResult[]>([])
  const [peopleResults, setPeopleResults] = useState<PersonResult[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding]   = useState<number | null>(null)

  // Rich search: picking a person drills into their filmography instead of
  // adding them directly (a person isn't a title) — 'view' tracks that.
  const [view, setView] = useState<'search' | 'person'>('search')
  const [selectedPerson, setSelectedPerson] = useState<PersonResult | null>(null)
  const [personCredits, setPersonCredits] = useState<PersonCreditItem[]>([])
  const [creditsLoading, setCreditsLoading] = useState(false)

  // Filter chips for movie/show results — client-side, over what's already
  // fetched. No runtime chip here: TMDB's search endpoint doesn't return
  // runtime (only full title lookups do), so there's nothing to filter on.
  const [decadeFilter, setDecadeFilter] = useState<DecadeFilter>('all')
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all')

  // Cancels the previous in-flight search whenever a newer one starts, so a
  // slow response for an earlier keystroke can't land after — and overwrite
  // — the result of a more recent one.
  const searchAbortRef = useRef<AbortController | null>(null)

  const search = useCallback(async (q: string, type: Tab) => {
    searchAbortRef.current?.abort()
    if (!q.trim()) { setResults([]); setPeopleResults([]); return }
    const controller = new AbortController()
    searchAbortRef.current = controller
    setLoading(true)
    try {
      if (type === 'people') {
        const res = await fetch(`/api/people/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        const data = await res.json()
        setPeopleResults(Array.isArray(data) ? data : [])
      } else {
        const endpoint = type === 'movie' ? `/api/movies/search?q=${encodeURIComponent(q)}` : `/api/shows/search?q=${encodeURIComponent(q)}`
        const res = await fetch(endpoint, { signal: controller.signal })
        const data: RawSearchItem[] = await res.json()
        setResults((Array.isArray(data) ? data : []).slice(0, 8).map(item => ({
          ...item,
          tmdbId: item.id,
          genres: item.genreIds ?? [],  // numeric IDs for DB; genreNames() strings are display-only
        })))
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      throw err
    } finally {
      if (searchAbortRef.current === controller) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (view === 'person') return  // filmography is already loaded, don't re-search underneath it
    const t = setTimeout(() => search(query, tab), 350)
    return () => clearTimeout(t)
  }, [query, tab, view, search])

  const switchTab = (t: Tab) => {
    setTab(t)
    setResults([])
    setPeopleResults([])
    setView('search')
    setSelectedPerson(null)
    setPersonCredits([])
    setDecadeFilter('all')
    setRatingFilter('all')
  }

  const matchesFilters = (item: SearchResult) => {
    if (decadeFilter !== 'all') {
      const y = parseInt(item.releaseYear ?? '0')
      if (decadeFilter === 'older') {
        if (y >= 2000) return false
      } else {
        const decadeStart = parseInt(decadeFilter)
        if (y < decadeStart || y >= decadeStart + 10) return false
      }
    }
    if (ratingFilter === 'high' && (item.imdbRating == null || item.imdbRating < 7)) return false
    return true
  }
  const filteredResults = results.filter(matchesFilters)
  const filtersActive = decadeFilter !== 'all' || ratingFilter !== 'all'

  const openPerson = async (person: PersonResult) => {
    setSelectedPerson(person)
    setView('person')
    setCreditsLoading(true)
    try {
      const res = await fetch(`/api/people/${person.id}/credits`)
      const data = await res.json()
      setPersonCredits(Array.isArray(data) ? data : [])
    } finally {
      setCreditsLoading(false)
    }
  }

  const closePerson = () => {
    setView('search')
    setSelectedPerson(null)
    setPersonCredits([])
  }

  const handleAdd = async (item: SearchResult) => {
    setAdding(item.tmdbId)
    try {
      await onAdd({ ...item, mediaType: item.mediaType ?? (tab === 'show' ? 'tv' : 'movie') })
    } finally {
      setAdding(null)
    }
  }

  const handleAddCredit = async (credit: PersonCreditItem) => {
    setAdding(credit.id)
    try {
      await onAdd({
        tmdbId: credit.id,
        title: credit.title,
        posterPath: credit.posterPath,
        releaseYear: credit.releaseYear != null ? String(credit.releaseYear) : undefined,
        genres: credit.genreIds,
        mediaType: credit.mediaType,
      })
    } finally {
      setAdding(null)
    }
  }

  return (
    /* Mobile: full screen below safe area. Desktop: centered overlay. */
    <div
      className="fixed inset-0 flex flex-col md:items-center md:justify-center md:p-4"
      style={{ background: 'rgba(0,0,0,0.8)', paddingTop: 'env(safe-area-inset-top)', zIndex: 60 }}
    >
      <ModalShell
        onClose={onClose}
        label="Search and add"
        className="flex flex-col flex-1 md:flex-none w-full md:max-w-xl md:rounded"
        style={{
          background: 'var(--surface)',
          border: '2px solid var(--amber)',
          maxHeight: '100%',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1rem', borderBottom: '1px solid var(--amber-dim)', flexShrink: 0 }}>
          {view === 'person' ? (
            <>
              <button
                onClick={closePerson}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--amber)', padding: 4, display: 'flex' }}
              >
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 14, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedPerson?.name.toUpperCase()}
              </span>
            </>
          ) : (
            <>
              <Search size={16} color="var(--amber)" />
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 14, flex: 1 }}>SEARCH &amp; ADD TO {destinationLabel}</span>
            </>
          )}
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cream-dim)', padding: '4px' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Tabs */}
        {view === 'search' && (
          <div style={{ display: 'flex', borderBottom: '1px solid var(--amber-dim)', flexShrink: 0 }}>
            {(['movie', 'show', 'people'] as const).map(t => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                style={{
                  flex: 1, padding: '0.75rem', background: tab === t ? 'var(--amber)' : 'transparent',
                  color: tab === t ? 'var(--bg)' : 'var(--cream-dim)',
                  border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {t === 'show' && <Tv size={13} />}
                {t === 'people' && <User size={13} />}
                {t === 'movie' ? '▶ MOVIES' : t === 'show' ? '📺 TV SHOWS' : 'PEOPLE'}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        {view === 'search' && (
          <div style={{ padding: '0.75rem 1rem', flexShrink: 0 }}>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={tab === 'movie' ? 'Search movies...' : tab === 'show' ? 'Search TV shows...' : 'Search actors, directors...'}
              style={{
                width: '100%', background: 'var(--bg)', border: '1px solid var(--amber-dim)',
                color: 'var(--cream)', padding: '0.65rem 0.75rem', borderRadius: 2,
                fontFamily: 'var(--font-mono)', fontSize: 16, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {/* Filter chips — movie/show results only */}
        {view === 'search' && tab !== 'people' && results.length > 0 && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '0 1rem 0.75rem', flexShrink: 0 }}>
            <FilterChips
              label="DECADE:" compact
              options={[['all','ALL'],['2020s','2020s'],['2010s','2010s'],['2000s','2000s'],['older','PRE-2000']] as const}
              active={decadeFilter} onChange={setDecadeFilter}
            />
            <FilterChips
              label="RATING:" compact
              options={[['all','ALL'],['high','7+ ★']] as const}
              active={ratingFilter} onChange={setRatingFilter}
            />
          </div>
        )}

        {/* Results */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {view === 'person' ? (
            creditsLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                LOADING FILMOGRAPHY...
              </div>
            ) : personCredits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--cream-dim)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                NO CREDITS FOUND.
              </div>
            ) : (
              personCredits.map(credit => (
                <div key={`${credit.mediaType}-${credit.id}`} style={{
                  display: 'flex', gap: 12, padding: '0.875rem 1rem',
                  borderBottom: '1px solid rgba(192,120,24,0.1)',
                  alignItems: 'center',
                }}>
                  <div style={{ width: 44, height: 66, flexShrink: 0, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                    {credit.posterPath
                      ? <Image src={posterUrl(credit.posterPath)!} alt={credit.title} fill style={{ objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Tv size={16} color="var(--amber-dim)" /></div>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--cream)', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{credit.title}</span>
                      {credit.mediaType === 'tv' && <Tv size={11} color="var(--amber-dim)" />}
                    </div>
                    <div style={{ color: 'var(--cream-dim)', fontSize: 12, fontFamily: 'var(--font-mono)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {credit.releaseYear ?? '—'}
                      <span style={{ marginLeft: 8, color: 'var(--cream-dim)' }}>{credit.role}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddCredit(credit)}
                    disabled={adding === credit.id}
                    className="vcr-btn"
                    style={{ fontSize: 12, padding: '0.5rem 0.85rem', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                  >
                    <Plus size={13} />
                    {adding === credit.id ? '...' : 'ADD'}
                  </button>
                </div>
              ))
            )
          ) : tab === 'people' ? (
            loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                SEARCHING...
              </div>
            ) : query.trim() && peopleResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--cream-dim)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                NO RESULTS FOR &quot;{query}&quot;.
              </div>
            ) : (
              peopleResults.map(person => (
                <button
                  key={person.id}
                  onClick={() => openPerson(person)}
                  style={{
                    display: 'flex', gap: 12, padding: '0.875rem 1rem', width: '100%',
                    borderBottom: '1px solid rgba(192,120,24,0.1)', alignItems: 'center',
                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--bg)', overflow: 'hidden', position: 'relative',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {person.profilePath
                      ? <Image src={posterUrl(person.profilePath)!} alt={person.name} fill style={{ objectFit: 'cover' }} />
                      : <User size={18} color="var(--amber-dim)" />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--cream)', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.name}</div>
                    <div style={{ color: 'var(--cream-dim)', fontSize: 12, fontFamily: 'var(--font-mono)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {person.knownForDepartment}
                      {person.knownFor.length > 0 && <span style={{ color: 'var(--cream-dim)' }}> · {person.knownFor.join(', ')}</span>}
                    </div>
                  </div>
                  <ChevronLeft size={16} color="var(--muted)" style={{ transform: 'rotate(180deg)', flexShrink: 0 }} />
                </button>
              ))
            )
          ) : (
            <>
              {loading && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  SEARCHING...
                </div>
              )}
              {!loading && query.trim() && results.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--cream-dim)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  NO RESULTS FOR &quot;{query}&quot;.
                </div>
              )}
              {!loading && results.length > 0 && filteredResults.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--cream-dim)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  NO MATCHES FOR THESE FILTERS{filtersActive ? ' — TRY LOOSENING ONE.' : '.'}
                </div>
              )}
              {!loading && filteredResults.map(item => (
                <div key={item.tmdbId} style={{
                  display: 'flex', gap: 12, padding: '0.875rem 1rem',
                  borderBottom: '1px solid rgba(192,120,24,0.1)',
                  alignItems: 'center',
                }}>
                  <div style={{ width: 44, height: 66, flexShrink: 0, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                    {item.posterPath
                      ? <Image src={posterUrl(item.posterPath)!} alt={item.title} fill style={{ objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Tv size={16} color="var(--amber-dim)" /></div>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--cream)', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                    <div style={{ color: 'var(--cream-dim)', fontSize: 12, fontFamily: 'var(--font-mono)', marginTop: 3 }}>
                      {item.releaseYear}
                      {item.imdbRating && <span style={{ marginLeft: 8, color: 'var(--amber)' }}>★ {item.imdbRating}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAdd(item)}
                    disabled={adding === item.tmdbId}
                    className="vcr-btn"
                    style={{ fontSize: 12, padding: '0.5rem 0.85rem', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Plus size={13} />
                    {adding === item.tmdbId ? '...' : 'ADD'}
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </ModalShell>
    </div>
  )
}
