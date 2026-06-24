'use client'
import { useState, useEffect, useRef } from 'react'
import { Zap } from 'lucide-react'
import VHSCard from '@/components/ui/VHSCard'
import PostWatchModal from '@/components/modals/PostWatchModal'
import type { PostWatchAnswers } from '@/lib/types'

const VISIBLE = 12

interface Movie {
  id: number; title: string; posterPath: string | null
  overview?: string; runtime?: number | null; genreIds?: number[]
  releaseYear?: number | null
  imdbRating?: number | null; rtScore?: number | null
}

export default function SuggestionsPage() {
  const [pool, setPool]           = useState<Movie[]>([])   // all fetched
  const [visible, setVisible]     = useState<Movie[]>([])   // currently shown
  const [loading, setLoading]     = useState(true)
  const [postWatch, setPostWatch] = useState<Movie | null>(null)
  const [addedIds, setAddedIds]   = useState<Set<number>>(new Set())
  const fetchingMore              = useRef(false)

  useEffect(() => {
    fetch('/api/suggestions')
      .then(r => r.json())
      .then(d => {
        const all = Array.isArray(d) ? d : []
        setPool(all)
        setVisible(all.slice(0, VISIBLE))
      })
      .finally(() => setLoading(false))
  }, [])

  const fetchMore = async (currentPool: Movie[]) => {
    if (fetchingMore.current) return
    fetchingMore.current = true
    try {
      const excludeIds = currentPool.map(m => m.id).join(',')
      const res = await fetch(`/api/suggestions?excludeIds=${excludeIds}`)
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        setPool(p => [...p, ...data])
      }
    } finally {
      fetchingMore.current = false
    }
  }

  const addToQueue = async (m: Movie) => {
    await fetch('/api/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tmdbId: m.id, mediaType: 'movie', title: m.title,
        posterPath: m.posterPath, genreIds: m.genreIds ?? [],
        runtime: m.runtime, releaseYear: m.releaseYear,
        imdbRating: m.imdbRating, rtScore: m.rtScore,
        overview: m.overview,
      }),
    })
    setAddedIds(s => new Set([...s, m.id]))
  }

  const handleDismiss = (id: number) => {
    setPool(currentPool => {
      const nextVisible = visible.filter(m => m.id !== id)
      const usedIds = new Set([...nextVisible.map(m => m.id), id])
      const backfill = currentPool.find(m => !usedIds.has(m.id))
      setVisible(backfill ? [...nextVisible, backfill] : nextVisible)

      const remaining = currentPool.filter(m => !usedIds.has(m.id)).length
      if (remaining < 6) fetchMore(currentPool)

      return currentPool
    })

    fetch('/api/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdb_id: id }),
    })
  }

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
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem' }}>
        <Zap size={18} color="var(--amber)" />
        <h1 style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 20, margin: 0, letterSpacing: 2 }}>SUGGESTED FOR YOU</h1>
      </div>
      <p style={{ color: 'var(--cream-dim)', fontSize: 13, marginBottom: '1.5rem', fontFamily: 'var(--font-mono)' }}>
        Based on your taste profile — thrillers, crime, drama, action.
      </p>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 13 }}>LOADING...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.25rem' }}>
          {visible.map(m => (
            <VHSCard
              key={m.id}
              tmdbId={m.id} title={m.title} posterPath={m.posterPath}
              mediaType="movie" runtime={m.runtime} releaseYear={m.releaseYear}
              imdbRating={m.imdbRating} rtScore={m.rtScore} overview={m.overview}
              isInQueue={addedIds.has(m.id)}
              onAddToQueue={addedIds.has(m.id) ? undefined : () => addToQueue(m)}
              onMarkWatched={() => setPostWatch(m)}
              onDismiss={() => handleDismiss(m.id)}
            />
          ))}
        </div>
      )}
      {postWatch && (
        <PostWatchModal
          title={postWatch.title} posterPath={postWatch.posterPath ?? null} mediaType="movie" runtime={postWatch.runtime ?? undefined}
          onSave={handlePostWatchSave} onClose={() => setPostWatch(null)}
        />
      )}
    </div>
  )
}
