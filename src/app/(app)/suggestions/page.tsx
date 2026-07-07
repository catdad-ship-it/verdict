'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Zap, SlidersHorizontal } from 'lucide-react'
import VHSCard from '@/components/ui/VHSCard'
import ListPickerSheet from '@/components/ui/ListPickerSheet'
import PostWatchModal from '@/components/modals/PostWatchModal'
import { apiFetch, fetchProvidersBatch, type ProviderData } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { useMarkWatched } from '@/hooks/useMarkWatched'
import { usePickList } from '@/hooks/usePickList'
import { CardGridSkeleton } from '@/components/ui/Skeleton'
import FilterChips from '@/components/ui/FilterChips'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import type { PostWatchAnswers } from '@/lib/types'

interface UserList { id: string; name: string }

const VISIBLE = 12

interface Movie {
  id: number; title: string; posterPath: string | null
  overview?: string; runtime?: number | null; genreIds?: number[]
  releaseYear?: number | null
  imdbRating?: number | null; rtScore?: number | null
  matchReason?: string
  mediaType?: 'movie' | 'tv'
}

const MOODS = [
  ['any',     'ANY'],
  ['tense',   'TENSE'],
  ['thinky',  'MADE ME THINK'],
  ['noise',   'BACKGROUND NOISE'],
  ['laugh',   'LAUGH'],
  ['comfort', 'COMFORT REWATCH'],
] as const
type MoodKey = typeof MOODS[number][0]

const MOOD_SUBTITLES: Record<MoodKey, string> = {
  any:     '',
  tense:   'Tense picks — thrillers, horror, mystery, crime.',
  thinky:  'Something to chew on — drama, mystery, sci-fi, history.',
  noise:   'Easy watching — light, familiar, low-commitment.',
  laugh:   'Something funny — comedy, rom-com, feel-good.',
  comfort: 'Favorites worth a rewatch — from your own history.',
}

interface SuggestState {
  pool: Movie[]           // all fetched, not yet shown
  visible: Movie[]        // currently on screen
  topGenreNames: string[] // derived from taste profile
}

type DecadeFilter = 'all' | '2020s' | '2010s' | '2000s' | 'older'
type RuntimeFilter = 'all' | 'short'
type RatingFilter = 'all' | 'high'

export default function SuggestionsPage() {
  const toast = useToast()
  const markWatched = useMarkWatched()
  const pickList = usePickList()
  const [state, setState]         = useState<SuggestState>({ pool: [], visible: [], topGenreNames: [] })
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [postWatch, setPostWatch] = useState<Movie | null>(null)
  const [addedIds, setAddedIds]   = useState<Set<number>>(new Set())
  const [lists, setLists]         = useState<UserList[]>([])
  const [pendingAdd, setPendingAdd] = useState<Movie | null>(null)
  const [providersMap, setProvidersMap] = useState<Record<string, ProviderData>>({})
  const [mood, setMood]           = useState<MoodKey>('any')
  const fetchingMore              = useRef(false)

  // Client-side filter chips — everything's already fetched, so narrowing
  // the grid down is just a filter over state.visible, no extra requests.
  const [decadeFilter, setDecadeFilter]   = useState<DecadeFilter>('all')
  const [runtimeFilter, setRuntimeFilter] = useState<RuntimeFilter>('all')
  const [ratingFilter, setRatingFilter]   = useState<RatingFilter>('all')
  const [showFilters, setShowFilters]     = useState(false)

  const providerReq = (m: Movie) => ({ tmdbId: m.id, mediaType: m.mediaType ?? 'movie' as const })

  const loadData = () => {
    setLoading(true)
    fetch('/api/lists').then(r => r.json()).then(d => setLists(Array.isArray(d) ? d : [])).catch(() => {})
    apiFetch(`/api/suggestions?mood=${mood}`)
      .then(r => r.json())
      .then((d: { movies: Movie[]; topGenreNames: string[] } | Movie[]) => {
        const movies = Array.isArray(d) ? d : (d.movies ?? [])
        const topGenreNames = Array.isArray(d) ? [] : (d.topGenreNames ?? [])
        setState({ pool: movies.slice(VISIBLE), visible: movies.slice(0, VISIBLE), topGenreNames })
        setLoadError(false)
        // One batched request for every card on the page instead of each
        // VHSCard firing its own /api/providers call.
        fetchProvidersBatch(movies.map(providerReq))
          .then(map => setProvidersMap(prev => ({ ...prev, ...map })))
      })
      .catch(err => { console.error('loadData failed:', err); setLoadError(true) })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood])

  const fetchMore = async (allSeenIds: number[]) => {
    // Comfort rewatch is a finite set pulled straight from watch history and
    // ignores excludeIds — paginating it would just re-serve dupes.
    if (mood === 'comfort') return
    if (fetchingMore.current) return
    fetchingMore.current = true
    try {
      const res = await fetch(`/api/suggestions?mood=${mood}&excludeIds=${allSeenIds.join(',')}`)
      const d: { movies: Movie[]; topGenreNames: string[] } | Movie[] = await res.json()
      const data = Array.isArray(d) ? d : (d.movies ?? [])
      if (data.length > 0) {
        setState(s => ({ ...s, pool: [...s.pool, ...data] }))
        fetchProvidersBatch(data.map(providerReq))
          .then(map => setProvidersMap(prev => ({ ...prev, ...map })))
      }
    } finally {
      fetchingMore.current = false
    }
  }

  const handlePickList = async (listId: 'queue' | string) => {
    const m = pendingAdd
    if (!m) return
    setPendingAdd(null)

    await pickList(listId, {
      tmdbId: m.id, title: m.title, posterPath: m.posterPath, genreIds: m.genreIds,
      mediaType: m.mediaType ?? 'movie',
      runtime: m.runtime, releaseYear: m.releaseYear,
      imdbRating: m.imdbRating, rtScore: m.rtScore, overview: m.overview,
    })
    setAddedIds(s => new Set([...s, m.id]))
    const destName = listId === 'queue' ? 'QUEUE' : (lists.find(l => l.id === listId)?.name.toUpperCase() ?? 'LIST')
    toast.show(`ADDED "${m.title.toUpperCase()}" TO ${destName}`)
  }

  const handleDismiss = (id: number, genreIds: number[], title: string) => {
    let removed: Movie | null = null

    setState(({ pool, visible, topGenreNames }) => {
      removed = visible.find(m => m.id === id) ?? pool.find(m => m.id === id) ?? null
      const nextVisible = visible.filter(m => m.id !== id)
      const backfill    = pool[0] ?? null
      const nextPool    = backfill ? pool.slice(1) : pool.filter(m => m.id !== id)

      // Fetch more when pool is running low
      if (nextPool.length < 6) {
        const allSeen = [...nextVisible, ...nextPool].map(m => m.id)
        allSeen.push(id)
        fetchMore(allSeen)
      }

      return {
        pool:    nextPool,
        visible: backfill ? [...nextVisible, backfill] : nextVisible,
        topGenreNames,
      }
    })

    // The card disappears immediately; the persistent "dismiss this genre"
    // call is deferred so UNDO can cancel it outright instead of needing a
    // compensating un-dismiss request.
    toast.showUndo(`DISMISSED "${title.toUpperCase()}"`, () => {
      fetch('/api/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdb_id: id, genre_ids: genreIds }),
        keepalive: true,
      })
    }, {
      onUndo: () => {
        if (!removed) return
        setState(s => ({ ...s, visible: [removed as Movie, ...s.visible] }))
      },
    })
  }

  const matchesFilters = (m: Movie) => {
    if (decadeFilter !== 'all') {
      const y = m.releaseYear ?? 0
      if (decadeFilter === 'older') {
        if (y >= 2000) return false
      } else {
        const decadeStart = parseInt(decadeFilter)
        if (y < decadeStart || y >= decadeStart + 10) return false
      }
    }
    if (runtimeFilter === 'short' && (m.runtime == null || m.runtime > 120)) return false
    if (ratingFilter === 'high' && (m.imdbRating == null || m.imdbRating < 7)) return false
    return true
  }
  const filteredVisible = state.visible.filter(matchesFilters)
  const activeFilterCount = [decadeFilter, runtimeFilter, ratingFilter].filter(f => f !== 'all').length
  const filtersActive = activeFilterCount > 0

  const handlePostWatchSave = async (answers: PostWatchAnswers) => {
    if (!postWatch) return
    await markWatched({
      mediaType:  postWatch.mediaType ?? 'movie',
      tmdbId:     postWatch.id,
      title:      postWatch.title,
      posterPath: postWatch.posterPath,
      genreIds:   postWatch.genreIds ?? [],
      runtime:    postWatch.runtime,
      releaseYear: postWatch.releaseYear,
    }, answers)
    setPostWatch(null)
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={18} color="var(--amber)" />
          <h1 style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 20, margin: 0, letterSpacing: 2 }}>SUGGESTED FOR YOU</h1>
        </div>
        <Link href="/settings#genre-tuning" style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, textDecoration: 'none',
          padding: '0.2rem 0.5rem', color: 'var(--cream-dim)',
          border: '1px solid var(--amber-dim)', borderRadius: 2,
        }}>TUNE TASTE</Link>
      </div>
      {mood !== 'any' && (
        <p style={{ color: 'var(--cream-dim)', fontSize: 13, marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
          {MOOD_SUBTITLES[mood]}
        </p>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <FilterChips label="MOOD:" options={MOODS} active={mood} onChange={setMood} />
      </div>
      {!loading && state.visible.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <button onClick={() => setShowFilters(s => !s)} style={{
            display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11,
            padding: '0.2rem 0.5rem', cursor: 'pointer', borderRadius: 2,
            background: filtersActive ? 'var(--amber-dim)' : 'transparent',
            color: filtersActive ? 'var(--amber)' : 'var(--cream-dim)',
            border: '1px solid var(--amber-dim)',
          }}>
            <SlidersHorizontal size={12} />
            FILTERS{filtersActive ? ` · ${activeFilterCount}` : ''}
          </button>
          {showFilters && (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: '0.75rem' }}>
              <FilterChips
                label="DECADE:"
                options={[['all','ALL'],['2020s','2020s'],['2010s','2010s'],['2000s','2000s'],['older','PRE-2000']] as const}
                active={decadeFilter} onChange={setDecadeFilter}
              />
              <FilterChips
                label="RUNTIME:"
                options={[['all','ALL'],['short','UNDER 2H']] as const}
                active={runtimeFilter} onChange={setRuntimeFilter}
              />
              <FilterChips
                label="RATING:"
                options={[['all','ALL'],['high','IMDb 7+']] as const}
                active={ratingFilter} onChange={setRatingFilter}
              />
            </div>
          )}
        </div>
      )}
      {loading ? (
        <CardGridSkeleton count={VISIBLE} />
      ) : loadError ? (
        <ErrorState onRetry={loadData} />
      ) : state.visible.length === 0 ? (
        <EmptyState
          title="NO SUGGESTIONS RIGHT NOW"
          subtitle="Watch or rate a few titles and check back — we'll have more to go on."
        />
      ) : filteredVisible.length === 0 ? (
        <EmptyState
          title="NO MATCHES FOR THESE FILTERS"
          subtitle={filtersActive ? 'Try loosening a filter above.' : undefined}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
          {filteredVisible.map(m => (
            <VHSCard
              key={`${m.mediaType ?? 'movie'}:${m.id}`}
              tmdbId={m.id} title={m.title} posterPath={m.posterPath}
              mediaType={m.mediaType ?? 'movie'} runtime={m.runtime} releaseYear={m.releaseYear}
              imdbRating={m.imdbRating} rtScore={m.rtScore} overview={m.overview}
              isInQueue={addedIds.has(m.id)}
              matchReason={m.matchReason}
              providerData={providersMap[`${m.mediaType ?? 'movie'}:${m.id}`]} batchManaged
              onAddToQueue={addedIds.has(m.id) ? undefined : () => setPendingAdd(m)}
              usesPickerFlow
              onMarkWatched={() => setPostWatch(m)}
              onDismiss={() => handleDismiss(m.id, m.genreIds ?? [], m.title)}
            />
          ))}
        </div>
      )}
      {postWatch && (
        <PostWatchModal
          title={postWatch.title} mediaType={postWatch.mediaType ?? 'movie'} runtime={postWatch.runtime ?? undefined}
          onSave={handlePostWatchSave} onClose={() => setPostWatch(null)}
        />
      )}
      {pendingAdd && (
        <ListPickerSheet
          lists={lists}
          onPick={handlePickList}
          onClose={() => setPendingAdd(null)}
          onListCreated={l => setLists(prev => [...prev, l])}
        />
      )}
    </div>
  )
}
