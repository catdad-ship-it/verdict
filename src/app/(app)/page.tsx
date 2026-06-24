'use client'
import { useState, useEffect, useCallback } from 'react'
import { Dice3, Plus, TrendingUp } from 'lucide-react'
import VHSCard from '@/components/ui/VHSCard'
import SpinWheelModal from '@/components/modals/SpinWheelModal'
import PostWatchModal from '@/components/modals/PostWatchModal'
import SearchAddModal from '@/components/modals/SearchAddModal'
import type { QueueItem, PostWatchAnswers } from '@/lib/types'

interface TrendingItem {
  tmdbId: number; title: string; posterPath: string | null
  runtime?: number; releaseYear?: number | null; imdbRating?: number | null; rtScore?: number | null
  redditVotes?: number; overview?: string; genreIds?: number[]; mediaType?: string
}

export default function HomePage() {
  const [queue, setQueue]           = useState<QueueItem[]>([])
  const [trending, setTrending]     = useState<{ movies: TrendingItem[]; shows: TrendingItem[] }>({ movies: [], shows: [] })
  const [showSpin, setShowSpin]     = useState(false)
  const [postWatch, setPostWatch]   = useState<QueueItem | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState<'all' | 'movie' | 'tv'>('all')
  const [sort, setSort]             = useState<'added' | 'runtime' | 'title'>('added')

  const fetchQueue = useCallback(async () => {
    setLoading(true)
    const data = await fetch('/api/queue').then(r => r.json())
    setQueue(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchQueue()
    fetch('/api/trending').then(r => r.json()).then(setTrending).catch(() => {})
  }, [fetchQueue])

  const addToQueue = async (item: {
    tmdbId: number; title: string; posterPath: string | null
    mediaType?: string; genreIds?: number[]; runtime?: number | null; overview?: string
  }) => {
    await fetch('/api/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    })
    await fetchQueue()
  }

  const removeFromQueue = async (tmdbId: number, mediaType: string) => {
    await fetch('/api/queue', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tmdbId, mediaType }),
    })
    setQueue(q => q.filter(i => !(i.tmdbId === tmdbId && i.mediaType === mediaType)))
  }

  const handlePostWatchSave = async (answers: PostWatchAnswers) => {
    if (!postWatch) return
    await fetch('/api/watched', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: postWatch.mediaType === 'tv' ? 'show' : 'movie',
        tmdb_id:    postWatch.tmdbId,
        title:      postWatch.title,
        poster_path: postWatch.posterPath,
        genre_ids:  postWatch.genreIds,
        runtime:    postWatch.runtime,
        user_rating: answers.userRating,
        what_worked: answers.whatWorked,
        want_more:   answers.wantMoreLikeThis,
        status: postWatch.mediaType === 'tv' ? 'watching' : undefined,
      }),
    })
    await fetchQueue()
    setPostWatch(null)
  }

  const displayQueue = queue
    .filter(i => filter === 'all' || i.mediaType === filter)
    .sort((a, b) => {
      if (sort === 'title')   return a.title.localeCompare(b.title)
      if (sort === 'runtime') return (a.runtime ?? 999) - (b.runtime ?? 999)
      return 0
    })

  const movieItems = queue.filter(i => i.mediaType === 'movie')

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 20, margin: 0, letterSpacing: 2 }}>MY QUEUE</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowSpin(true)} disabled={movieItems.length === 0}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--amber)', opacity: 0.65, padding: '0.25rem', display: 'flex', alignItems: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.65')}>
            <Dice3 size={26} />
          </button>
        </div>
      </div>

      {/* Filter/sort bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {([['all','ALL'],['movie','▶ MOVIES'],['tv','▣ SHOWS']] as const).map(([f, label]) => (
          <button key={f} onClick={() => setFilter(f as any)} style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, padding: '0.3rem 0.7rem',
            background: filter === f ? 'var(--amber)' : 'transparent',
            color: filter === f ? 'var(--bg)' : 'var(--cream-dim)',
            border: '1px solid var(--amber-dim)', borderRadius: 2, cursor: 'pointer',
          }}>{label}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cream-dim)' }}>SORT:</span>
          {(['added','title','runtime'] as const).map(s => (
            <button key={s} onClick={() => setSort(s)} style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, padding: '0.2rem 0.5rem',
              background: sort === s ? 'var(--amber-dim)' : 'transparent',
              color: sort === s ? 'var(--amber)' : 'var(--cream-dim)',
              border: '1px solid var(--amber-dim)', borderRadius: 2, cursor: 'pointer',
            }}>{s.toUpperCase()}</button>
          ))}
        </div>
      </div>

      {/* Queue grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 13 }}>LOADING...</div>
      ) : displayQueue.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-mono)', color: 'var(--cream-dim)', fontSize: 13 }}>
          {queue.length === 0 ? 'YOUR QUEUE IS EMPTY. ADD SOME TITLES ▶' : 'NO TITLES MATCH THAT FILTER.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.25rem' }}>
          {displayQueue.map(item => (
            <VHSCard
              key={`${item.tmdbId}-${item.mediaType}`}
              tmdbId={item.tmdbId}
              title={item.title}
              posterPath={item.posterPath}
              mediaType={item.mediaType}
              runtime={item.runtime}
              releaseYear={item.releaseYear}
              imdbRating={item.imdbRating}
              rtScore={item.rtScore}
              overview={item.overview}
              isInQueue
              onMarkWatched={() => setPostWatch(item)}
              onRemoveFromQueue={() => removeFromQueue(item.tmdbId, item.mediaType)}
            />
          ))}
        </div>
      )}

      {/* Trending on Reddit */}
      {(trending.movies.length > 0 || trending.shows.length > 0) && (
        <section style={{ marginTop: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
            <TrendingUp size={16} color="var(--amber)" />
            <h2 style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 16, margin: 0, letterSpacing: 2 }}>TRENDING ON REDDIT</h2>
          </div>
          <div className="hscroll" style={{ overflowX: 'auto', paddingBottom: 8 }}>
            <div style={{ display: 'flex', gap: '1rem', minWidth: 'max-content' }}>
              {[...trending.movies, ...trending.shows].map((item, idx) => (
                <div key={idx} style={{ width: 140, flexShrink: 0 }}>
                  <VHSCard
                    tmdbId={item.tmdbId}
                    title={item.title}
                    posterPath={item.posterPath}
                    mediaType={item.mediaType === 'show' ? 'tv' : 'movie'}
                    runtime={item.runtime}
                    releaseYear={item.releaseYear}
                    imdbRating={item.imdbRating}
                    rtScore={item.rtScore}
                    overview={item.overview}
                    isReddit
                    redditVotes={item.redditVotes}
                    onAddToQueue={() => addToQueue({
                      tmdbId: item.tmdbId, title: item.title, posterPath: item.posterPath,
                      mediaType: item.mediaType, genreIds: item.genreIds, runtime: item.runtime,
                      overview: item.overview,
                    })}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAB — mobile only, hidden on md+ */}
      <button onClick={() => setShowSearch(true)} className="vcr-fab" aria-label="Add title">
        <Plus size={22} />
      </button>

      {showSpin && <SpinWheelModal items={movieItems} onClose={() => setShowSpin(false)} onPick={() => {}} />}
      {postWatch && (
        <PostWatchModal
          title={postWatch.title}
          posterPath={postWatch.posterPath}
          mediaType={postWatch.mediaType}
          runtime={postWatch.runtime ?? undefined}
          onSave={handlePostWatchSave}
          onClose={() => setPostWatch(null)}
        />
      )}
      {showSearch && (
        <SearchAddModal
          onClose={() => setShowSearch(false)}
          onAdd={async item => addToQueue({
            tmdbId: item.tmdbId, title: item.title, posterPath: item.posterPath,
            mediaType: item.mediaType, genreIds: item.genres, runtime: item.runtime,
            overview: item.overview,
          })}
        />
      )}
    </div>
  )
}
