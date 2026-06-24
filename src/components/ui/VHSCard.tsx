'use client'
import Image from 'next/image'
import { Clock, Plus, Check, Tv } from 'lucide-react'
import { posterUrl, formatRuntime, calcFinishTime } from '@/lib/utils'
import { QueueItem, WatchedMovie } from '@/lib/types'

interface VHSCardProps {
  tmdbId: number
  title: string
  posterPath: string | null
  mediaType: 'movie' | 'tv'
  runtime?: number | null
  releaseYear?: number
  imdbRating?: number | null
  rtScore?: number | null
  isNew?: boolean
  isSoon?: boolean
  isReddit?: boolean
  redditVotes?: number
  isInQueue?: boolean
  isWatched?: boolean
  currentSeason?: number
  totalSeasons?: number
  onAddToQueue?: () => void
  onMarkWatched?: () => void
  onRemoveFromQueue?: () => void
  onClick?: () => void
}

export default function VHSCard({
  tmdbId, title, posterPath, mediaType, runtime, releaseYear,
  imdbRating, rtScore, isNew, isSoon, isReddit, redditVotes,
  isInQueue, isWatched, currentSeason, totalSeasons,
  onAddToQueue, onMarkWatched, onRemoveFromQueue, onClick,
}: VHSCardProps) {
  const imgUrl = posterUrl(posterPath)
  const finish = runtime ? calcFinishTime(runtime) : null

  return (
    <div
      className="rounded-sm overflow-hidden cursor-pointer group"
      style={{
        background: 'var(--card)',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-5px) scale(1.015)'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 16px 36px rgba(0,0,0,0.7), 0 0 20px rgba(192,120,24,0.12)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = ''
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = ''
      }}
      onClick={onClick}
    >
      {/* Poster */}
      <div className="relative" style={{ aspectRatio: '2/3', background: 'var(--raised)' }}>
        {imgUrl ? (
          <Image src={imgUrl} alt={title} fill className="object-cover" sizes="160px" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span style={{ fontSize: '2.5rem', opacity: 0.15 }}>🎬</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0" style={{
          height: '58%',
          background: 'linear-gradient(to top, rgba(8,6,4,0.97) 0%, rgba(8,6,4,0.55) 55%, transparent 100%)',
        }} />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {isNew  && <span className="badge-new">NEW</span>}
          {isSoon && <span className="badge-soon">SOON</span>}
          {isReddit && <span className="badge-reddit">r/movies</span>}
          {mediaType === 'tv' && (
            <span className="flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded-sm"
              style={{ background: 'var(--forest)', color: '#A8C898', fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              <Tv size={8} /> SHOW
            </span>
          )}
        </div>

        {/* Ratings */}
        {(imdbRating || rtScore) && (
          <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
            {imdbRating && (
              <span style={{ background: '#D4960A', color: '#0A0800', fontWeight: 700, fontSize: '0.6rem', padding: '1px 5px', borderRadius: '1px', letterSpacing: '0.04em' }}>
                ★ {imdbRating}
              </span>
            )}
            {rtScore && (
              <span style={{ fontWeight: 700, fontSize: '0.6rem', color: '#D0603C' }}>
                🍅 {rtScore}%
              </span>
            )}
          </div>
        )}

        {/* Title area */}
        <div className="absolute inset-x-0 bottom-0 p-2.5 z-10">
          <p className="font-bold text-sm leading-tight mb-0.5" style={{ color: 'var(--cream)', letterSpacing: '0.03em' }}>
            {title}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {releaseYear && <span className="text-xs" style={{ color: 'var(--muted)' }}>{releaseYear}</span>}
            {runtime && <span className="text-xs" style={{ color: 'var(--muted)' }}>{formatRuntime(runtime)}</span>}
            {mediaType === 'tv' && currentSeason && totalSeasons && (
              <span className="text-xs" style={{ color: 'var(--muted)' }}>S{currentSeason}/{totalSeasons}</span>
            )}
          </div>
          {finish && !isSoon && (
            <div className="flex items-center gap-1 mt-1">
              <Clock size={9} style={{ color: 'var(--amber)', opacity: 0.8 }} />
              <span className="text-xs" style={{ color: 'var(--amber)', opacity: 0.8, fontSize: '0.58rem' }}>
                Done by {finish.endTime}{finish.isLate ? ' +1' : ''}
              </span>
            </div>
          )}
          {isReddit && redditVotes && (
            <p className="text-xs mt-0.5" style={{ color: '#C05830', fontSize: '0.58rem' }}>
              {redditVotes.toLocaleString()} upvotes
            </p>
          )}
        </div>
      </div>

      {/* VHS Footer — tape casing aesthetic */}
      <div className="px-2.5 py-2 flex gap-2 items-center relative"
           style={{ background: '#0E0C09', borderTop: '2px solid #1A1610' }}>
        {/* Tape reel dots */}
        <span className="absolute right-2 bottom-2 text-xs" style={{ color: '#1A1610', letterSpacing: '4px', fontSize: '0.4rem' }}>● ●</span>

        {isWatched ? (
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)', fontSize: '0.6rem' }}>
            ✓ Watched
          </span>
        ) : isInQueue ? (
          <>
            <button onClick={e => { e.stopPropagation(); onMarkWatched?.() }}
              className="vcr-btn text-xs px-2 py-1 flex-1" style={{ fontSize: '0.62rem' }}>
              ✓ WATCHED
            </button>
            {onRemoveFromQueue && (
              <button onClick={e => { e.stopPropagation(); onRemoveFromQueue?.() }}
                className="flex items-center justify-center w-7 h-7 rounded-sm"
                style={{ background: 'var(--raised)', border: '1px solid var(--border)', color: 'var(--muted)' }}
                title="Remove from queue">
                ✕
              </button>
            )}
          </>
        ) : isSoon ? (
          <button onClick={e => { e.stopPropagation(); onAddToQueue?.() }}
            className="vcr-btn text-xs px-2 py-1 w-full" style={{ fontSize: '0.62rem' }}>
            NOTIFY ME
          </button>
        ) : (
          <button onClick={e => { e.stopPropagation(); onAddToQueue?.() }}
            className="vcr-btn-primary text-xs px-2 py-1 w-full flex items-center justify-center gap-1" style={{ fontSize: '0.62rem' }}>
            <Plus size={10} /> QUEUE
          </button>
        )}
      </div>
    </div>
  )
}
