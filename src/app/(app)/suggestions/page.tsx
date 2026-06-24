'use client'
import { useState, useEffect } from 'react'
import { Zap } from 'lucide-react'
import VHSCard from '@/components/ui/VHSCard'
import PostWatchModal from '@/components/modals/PostWatchModal'
import type { PostWatchAnswers } from '@/lib/types'

interface Movie {
  id: number; title: string; posterPath: string | null
  overview?: string; runtime?: number | null; genreIds?: number[]
  releaseYear?: number | null
  imdbRating?: number | null; rtScore?: number | null
}

export default function SuggestionsPage() {
  const [movies, setMovies]       = useState<Movie[]>([])
  const [loading, setLoading]     = useState(true)
  const [postWatch, setPostWatch] = useState<Movie | null>(null)
  const [addedIds, setAddedIds]   = useState<Set<number>>(new Set())
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetch('/api/suggestions')
      .then(r => r.json())
      .then(d => setMovies(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

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
    setDismissed(s => new Set([...s, id]))
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
          {movies.filter(m => !dismissed.has(m.id)).map(m => (
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
