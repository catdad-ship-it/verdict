'use client'
import { useState, useEffect } from 'react'
import { Film } from 'lucide-react'
import VHSCard from '@/components/ui/VHSCard'
import ListPickerSheet from '@/components/ui/ListPickerSheet'
import PostWatchModal from '@/components/modals/PostWatchModal'
import { fetchProvidersBatch, type ProviderData } from '@/lib/utils'
import type { PostWatchAnswers } from '@/lib/types'

interface Movie {
  id: number; tmdbId?: number; title: string; posterPath: string | null
  overview?: string; runtime?: number | null; genreIds?: number[]
  releaseYear?: number | null
  imdbRating?: number | null; rtScore?: number | null
}
interface UserList { id: string; name: string }

// Defined at module scope so React doesn't see a new component type on each render
// (which would unmount/remount all VHSCards and re-fire their provider fetches)
function Shelf({
  title, items, dismissed, addedIds, providersMap, soon, stream, onAddToQueue, onMarkWatched, onDismiss,
}: {
  title: string; items: Movie[]; dismissed: Set<number>; addedIds: Set<number>
  providersMap: Record<string, ProviderData>
  soon?: boolean; stream?: boolean
  onAddToQueue: (m: Movie) => void
  onMarkWatched: (m: Movie) => void
  onDismiss: (m: Movie) => void
}) {
  const visible = items.filter(m => !dismissed.has(m.tmdbId!))
  if (visible.length === 0) return null
  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
        <Film size={16} color="var(--amber)" />
        <h2 style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 16, margin: 0, letterSpacing: 2 }}>{title}</h2>
      </div>
      <div className="hscroll" style={{ overflowX: 'auto', paddingBottom: 8 }}>
        <div style={{ display: 'flex', gap: '1rem', minWidth: 'max-content' }}>
          {visible.map(m => (
            <div key={m.tmdbId} style={{ width: 150, flexShrink: 0 }}>
              <VHSCard
                tmdbId={m.tmdbId!} title={m.title} posterPath={m.posterPath}
                mediaType="movie" runtime={m.runtime} releaseYear={m.releaseYear}
                imdbRating={m.imdbRating} rtScore={m.rtScore} overview={m.overview}
                providerData={providersMap[`movie:${m.tmdbId}`]}
                isNew={!soon && !stream} isSoon={soon}
                isInQueue={addedIds.has(m.tmdbId!)}
                onAddToQueue={addedIds.has(m.tmdbId!) ? undefined : () => onAddToQueue(m)}
                onMarkWatched={!soon ? () => onMarkWatched(m) : undefined}
                onDismiss={() => onDismiss(m)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function NewReleasesPage() {
  const [nowPlaying, setNowPlaying]   = useState<Movie[]>([])
  const [upcoming, setUpcoming]       = useState<Movie[]>([])
  const [streaming, setStreaming]     = useState<Movie[]>([])
  const [loading, setLoading]         = useState(true)
  const [postWatch, setPostWatch]     = useState<Movie | null>(null)
  const [dismissed, setDismissed]     = useState<Set<number>>(new Set())
  const [lists, setLists]             = useState<UserList[]>([])
  const [pendingAdd, setPendingAdd]   = useState<Movie | null>(null)
  const [addedIds, setAddedIds]       = useState<Set<number>>(new Set())
  const [providersMap, setProvidersMap] = useState<Record<string, ProviderData>>({})

  useEffect(() => {
    fetch('/api/lists').then(r => r.json()).then(d => setLists(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/new-releases')
      .then(r => r.json())
      .then(d => {
        const map = (m: any) => ({ ...m, tmdbId: m.id, genreIds: m.genreIds ?? [] })
        const now = (d.nowPlaying ?? []).map(map)
        const soon = (d.upcoming ?? []).map(map)
        const stream = (d.streaming ?? []).map(map)
        setNowPlaying(now)
        setUpcoming(soon)
        setStreaming(stream)
        // Batch every shelf's provider lookups into one request instead of
        // one fetch per card (these shelves can run 20+ titles each).
        const all: Movie[] = [...now, ...soon, ...stream]
        fetchProvidersBatch(all.map(m => ({ tmdbId: m.tmdbId!, mediaType: 'movie' as const })))
          .then(result => setProvidersMap(prev => ({ ...prev, ...result })))
      })
      .finally(() => setLoading(false))
  }, [])

  const handlePickList = async (listId: 'queue' | string) => {
    const m = pendingAdd
    if (!m) return
    setPendingAdd(null)

    const body = {
      tmdbId: m.tmdbId ?? m.id, mediaType: 'movie', title: m.title,
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
    setAddedIds(s => new Set([...s, m.tmdbId ?? m.id!]))
  }

  const handleDismiss = (m: Movie) => {
    setDismissed(s => new Set([...s, m.tmdbId!]))
    fetch('/api/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: m.tmdbId }),
    })
  }

  const handlePostWatchSave = async (answers: PostWatchAnswers) => {
    if (!postWatch) return
    await fetch('/api/watched', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'movie', tmdb_id: postWatch.tmdbId, title: postWatch.title,
        poster_path: postWatch.posterPath, genre_ids: postWatch.genreIds ?? [],
        runtime: postWatch.runtime, user_rating: answers.userRating,
        what_worked: answers.whatWorked, want_more: answers.wantMoreLikeThis,
      }),
    })
    setPostWatch(null)
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 0' }}>
      <h1 style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 20, marginBottom: '1.5rem', letterSpacing: 2 }}>NEW RELEASES</h1>
      {loading
        ? <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 13 }}>LOADING...</div>
        : <>
            <Shelf title="NEW TO STREAMING" items={streaming} dismissed={dismissed} addedIds={addedIds} providersMap={providersMap} stream onAddToQueue={setPendingAdd} onMarkWatched={setPostWatch} onDismiss={handleDismiss} />
            <Shelf title="NOW PLAYING" items={nowPlaying} dismissed={dismissed} addedIds={addedIds} providersMap={providersMap} onAddToQueue={setPendingAdd} onMarkWatched={setPostWatch} onDismiss={handleDismiss} />
            <Shelf title="COMING SOON" items={upcoming} dismissed={dismissed} addedIds={addedIds} providersMap={providersMap} soon onAddToQueue={setPendingAdd} onMarkWatched={setPostWatch} onDismiss={handleDismiss} />
          </>
      }
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
