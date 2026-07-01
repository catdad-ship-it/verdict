'use client'
import { useState, useEffect, useRef } from 'react'
import { Zap } from 'lucide-react'
import VHSCard from '@/components/ui/VHSCard'
import ListPickerSheet from '@/components/ui/ListPickerSheet'
import PostWatchModal from '@/components/modals/PostWatchModal'
import { fetchProvidersBatch, type ProviderData } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { CardGridSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import type { PostWatchAnswers } from '@/lib/types'

interface UserList { id: string; name: string }

const VISIBLE = 12

interface Movie {
  id: number; title: string; posterPath: string | null
  overview?: string; runtime?: number | null; genreIds?: number[]
  releaseYear?: number | null
  imdbRating?: number | null; rtScore?: number | null
  matchReason?: string
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
  const [state, setState]         = useState<SuggestState>({ pool: [], visible: [], topGenreNames: [] })
  const [loading, setLoading]     = useState(true)
  const [postWatch, setPostWatch] = useState<Movie | null>(null)
  const [addedIds, setAddedIds]   = useState<Set<number>>(new Set())
  const [lists, setLists]         = useState<UserList[]>([])
  const [pendingAdd, setPendingAdd] = useState<Movie | null>(null)
  const [providersMap, setProvidersMap] = useState<Record<string, ProviderData>>({})
  const fetchingMore              = useRef(false)

  // Client-side filter chips — everything's already fetched, so narrowing
  // the grid down is just a filter over state.visible, no extra requests.
  const [decadeFilter, setDecadeFilter]   = useState<DecadeFilter>('all')
  const [runtimeFilter, setRuntimeFilter] = useState<RuntimeFilter>('all')
  const [ratingFilter, setRatingFilter]   = useState<RatingFilter>('all')

  useEffect(() => {
    fetch('/api/lists').then(r => r.json()).then(d => setLists(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/suggestions')
      .then(r => r.json())
      .then((d: { movies: Movie[]; topGenreNames: string[] } | Movie[]) => {
        const movies = Array.isArray(d) ? d : (d.movies ?? [])
        const topGenreNames = Array.isArray(d) ? [] : (d.topGenreNames ?? [])
        setState({ pool: movies.slice(VISIBLE), visible: movies.slice(0, VISIBLE), topGenreNames })
        // One batched request for every card on the page instead of each
        // VHSCard firing its own /api/providers call.
        fetchProvidersBatch(movies.map(m => ({ tmdbId: m.id, mediaType: 'movie' as const })))
          .then(map => setProvidersMap(prev => ({ ...prev, ...map })))
      })
      .finally(() => setLoading(false))
  }, [])

  const fetchMore = async (allSeenIds: number[]) => {
    if (fetchingMore.current) return
    fetchingMore.current = true
    try {
      const res = await fetch(`/api/suggestions?excludeIds=${allSeenIds.join(',')}`)
      const d: { movies: Movie[]; topGenreNames: string[] } | Movie[] = await res.json()
      const data = Array.isArray(d) ? d : (d.movies ?? [])
      if (data.length > 0) {
        setState(s => ({ ...s, pool: [...s.pool, ...data] }))
        fetchProvidersBatch(data.map(m => ({ tmdbId: m.id, mediaType: 'movie' as const })))
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

    const body = {
      tmdbId: m.id, mediaType: 'movie', title: m.title,
      posterPath: m.posterPath, genreIds: m.genreIds ?? [],
      runtime: m.runtime, releaseYear: m.releaseYear,
      imdbRating: m.imdbRating, rtScore: m.rtScore,
      overview: m.overview,
    }

    const url = listId === 'queue' ? '/api/queue' : `/api/lists/${listId}/items`
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setAddedIds(s => new Set([...s, m.id]))
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
  const filtersActive = decadeFilter !== 'all' || runtimeFilter !== 'all' || ratingFilter !== 'all'

  const handlePostWatchSave = async (answers: PostWatchAnswers) => {
    if (!postWatch) return
    await fetch('/api/watched', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'movie', tmdb_id: postWatch.id, title: postWatch.title,
        poster_path: postWatch.posterPath, genre_ids: postWatch.genreIds ?? [],
        runtime: postWatch.runtime, user_rating: answers.userRating,
        what_worked: answers.whatWorked, want_more: answers.wantMoreLikeThis,
      }),
    })
    setPostWatch(null)
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem' }}>
        <Zap size={18} color="var(--amber)" />
        <h1 style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 20, margin: 0, letterSpacing: 2 }}>SUGGESTED FOR YOU</h1>
      </div>
      <p style={{ color: 'var(--cream-dim)', fontSize: 13, marginBottom: '1.5rem', fontFamily: 'var(--font-mono)' }}>
        {state.topGenreNames.length > 0
          ? `Based on your taste profile — ${state.topGenreNames.map(g => g.toLowerCase()).join(', ')}.`
          : 'Based on your taste profile.'}
      </p>
      {!loading && state.visible.length > 0 && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>DECADE:</span>
            {([['all','ALL'],['2020s','2020s'],['2010s','2010s'],['2000s','2000s'],['older','PRE-2000']] as const).map(([v, label]) => (
              <button key={v} onClick={() => setDecadeFilter(v)} style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, padding: '0.2rem 0.5rem',
                background: decadeFilter === v ? 'var(--amber-dim)' : 'transparent',
                color: decadeFilter === v ? 'var(--amber)' : 'var(--cream-dim)',
                border: '1px solid var(--amber-dim)', borderRadius: 2, cursor: 'pointer',
              }}>{label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>RUNTIME:</span>
            {([['all','ALL'],['short','UNDER 2H']] as const).map(([v, label]) => (
              <button key={v} onClick={() => setRuntimeFilter(v)} style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, padding: '0.2rem 0.5rem',
                background: runtimeFilter === v ? 'var(--amber-dim)' : 'transparent',
                color: runtimeFilter === v ? 'var(--amber)' : 'var(--cream-dim)',
                border: '1px solid var(--amber-dim)', borderRadius: 2, cursor: 'pointer',
              }}>{label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>RATING:</span>
            {([['all','ALL'],['high','7+ ★']] as const).map(([v, label]) => (
              <button key={v} onClick={() => setRatingFilter(v)} style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, padding: '0.2rem 0.5rem',
                background: ratingFilter === v ? 'var(--amber-dim)' : 'transparent',
                color: ratingFilter === v ? 'var(--amber)' : 'var(--cream-dim)',
                border: '1px solid var(--amber-dim)', borderRadius: 2, cursor: 'pointer',
              }}>{label}</button>
            ))}
          </div>
        </div>
      )}
      {loading ? (
        <CardGridSkeleton count={VISIBLE} />
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
              key={m.id}
              tmdbId={m.id} title={m.title} posterPath={m.posterPath}
              mediaType="movie" runtime={m.runtime} releaseYear={m.releaseYear}
              imdbRating={m.imdbRating} rtScore={m.rtScore} overview={m.overview}
              isInQueue={addedIds.has(m.id)}
              matchReason={m.matchReason}
              providerData={providersMap[`movie:${m.id}`]}
              onAddToQueue={addedIds.has(m.id) ? undefined : () => setPendingAdd(m)}
              onMarkWatched={() => setPostWatch(m)}
              onDismiss={() => handleDismiss(m.id, m.genreIds ?? [], m.title)}
            />
          ))}
        </div>
      )}
      {postWatch && (
        <PostWatchModal
          title={postWatch.title} mediaType="movie" runtime={postWatch.runtime ?? undefined}
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
