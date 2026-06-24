'use client'
import { useState, useEffect } from 'react'
import { Film } from 'lucide-react'
import VHSCard from '@/components/ui/VHSCard'
import PostWatchModal from '@/components/modals/PostWatchModal'
import type { PostWatchAnswers } from '@/lib/types'

interface Movie {
  tmdbId: number; title: string; posterPath: string | null
  overview?: string; runtime?: number; genreIds?: number[]
  imdbRating?: number | null; rtScore?: number | null
}

export default function NewReleasesPage() {
  const [nowPlaying, setNowPlaying] = useState<Movie[]>([])
  const [upcoming, setUpcoming]     = useState<Movie[]>([])
  const [loading, setLoading]       = useState(true)
  const [postWatch, setPostWatch]   = useState<Movie | null>(null)

  useEffect(() => {
    fetch('/api/new-releases')
      .then(r => r.json())
      .then(d => {
        setNowPlaying((d.nowPlaying ?? []).map((m: any) => ({ ...m, genreIds: m.genres ?? [] })))
        setUpcoming((d.upcoming ?? []).map((m: any) => ({ ...m, genreIds: m.genres ?? [] })))
      })
      .finally(() => setLoading(false))
  }, [])

  const addToQueue = async (m: Movie) => {
    await fetch('/api/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId: m.tmdbId, mediaType: 'movie', title: m.title, posterPath: m.posterPath, genreIds: m.genreIds ?? [], runtime: m.runtime, overview: m.overview }),
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

  const Shelf = ({ title, items, soon }: { title: string; items: Movie[]; soon?: boolean }) => (
    <section style={{ marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
        <Film size={16} color="var(--amber)" />
        <h2 style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 16, margin: 0, letterSpacing: 2 }}>{title}</h2>
      </div>
      <div className="hscroll" style={{ overflowX: 'auto', paddingBottom: 8 }}>
        <div style={{ display: 'flex', gap: '1rem', minWidth: 'max-content' }}>
          {items.map(m => (
            <div key={m.tmdbId} style={{ width: 150, flexShrink: 0 }}>
              <VHSCard
                tmdbId={m.tmdbId} title={m.title} posterPath={m.posterPath}
                mediaType="movie" runtime={m.runtime}
                imdbRating={m.imdbRating} rtScore={m.rtScore}
                isNew={!soon} isSoon={soon}
                onAddToQueue={() => addToQueue(m)}
                onMarkWatched={!soon ? () => setPostWatch(m) : undefined}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <h1 style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 20, marginBottom: '1.5rem', letterSpacing: 2 }}>NEW RELEASES</h1>
      {loading
        ? <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 13 }}>LOADING...</div>
        : <><Shelf title="NOW PLAYING" items={nowPlaying} /><Shelf title="COMING SOON" items={upcoming} soon /></>
      }
      {postWatch && (
        <PostWatchModal
          title={postWatch.title} posterPath={postWatch.posterPath} mediaType="movie" runtime={postWatch.runtime}
          onSave={handlePostWatchSave} onClose={() => setPostWatch(null)}
        />
      )}
    </div>
  )
}
