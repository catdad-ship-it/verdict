'use client'
import Image from 'next/image'
import { useState } from 'react'
import { Clock } from 'lucide-react'
import { posterUrl, formatRuntime, calcFinishTime } from '@/lib/utils'

interface QueueRowProps {
  tmdbId: number
  title: string
  posterPath: string | null
  mediaType: 'movie' | 'tv'
  runtime?: number | null
  releaseYear?: number | null
  imdbRating?: number | null
  rtScore?: number | null
  overview?: string | null
  currentSeason?: number
  totalSeasons?: number
  onMarkWatched?: () => void
  onRemoveFromQueue?: () => void
}

export default function QueueRow({
  tmdbId, title, posterPath, mediaType, runtime, releaseYear,
  imdbRating, rtScore, overview,
  currentSeason, totalSeasons,
  onMarkWatched, onRemoveFromQueue,
}: QueueRowProps) {
  const imgUrl = posterUrl(posterPath)
  const finish = runtime ? calcFinishTime(runtime) : null
  const [synopsisOpen, setSynopsisOpen] = useState(false)
  const [removing, setRemoving]         = useState(false)

  const handleRemove = () => {
    setRemoving(true)
    onRemoveFromQueue?.()
  }

  return (
    <div style={{
      display: 'flex', gap: 12, padding: '10px 0',
      borderBottom: '1px solid var(--border)',
      opacity: removing ? 0.4 : 1, transition: 'opacity 0.2s',
    }}>
      {/* Poster */}
      <div
        style={{ width: 60, flexShrink: 0, borderRadius: 2, overflow: 'hidden', cursor: overview ? 'pointer' : 'default', position: 'relative', aspectRatio: '2/3', background: 'var(--raised)' }}
        onClick={() => overview && setSynopsisOpen(s => !s)}
      >
        {imgUrl ? (
          <Image src={imgUrl} alt={title} fill className="object-cover" sizes="60px" />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.25rem', opacity: 0.15 }}>🎬</span>
          </div>
        )}
        {mediaType === 'tv' && (
          <div style={{
            position: 'absolute', bottom: 2, left: 2,
            background: 'var(--forest)', color: '#A8C898',
            fontSize: 7, fontFamily: 'var(--font-mono)',
            padding: '1px 3px', borderRadius: 1, letterSpacing: 1,
          }}>TV</div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 }}>
        {synopsisOpen && overview ? (
          <p style={{ fontSize: 11, color: 'var(--cream)', lineHeight: 1.5, margin: 0, cursor: 'pointer' }}
             onClick={() => setSynopsisOpen(false)}>
            {overview}
          </p>
        ) : (
          <>
            <p style={{
              fontWeight: 700, fontSize: 14, color: 'var(--cream)', margin: 0,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: 0.2,
            }}>
              {title}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {releaseYear && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>
                  {releaseYear}
                </span>
              )}
              {runtime && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>
                  {formatRuntime(runtime)}
                </span>
              )}
              {mediaType === 'tv' && currentSeason && totalSeasons && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>
                  S{currentSeason}/{totalSeasons}
                </span>
              )}
            </div>
            {finish && mediaType !== 'tv' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={9} style={{ color: 'var(--amber)', opacity: 0.8 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--amber)', opacity: 0.8 }}>
                  Done by {finish.endTime}{finish.isLate ? ' +1' : ''}
                </span>
              </div>
            )}
            {(imdbRating || rtScore) && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {imdbRating && (
                  <span style={{ background: '#D4960A', color: '#0A0800', fontWeight: 700, fontSize: 9, padding: '1px 4px', borderRadius: 1 }}>
                    ★ {imdbRating}
                  </span>
                )}
                {rtScore && (
                  <span style={{ fontWeight: 700, fontSize: 10, color: '#D0603C' }}>
                    🍅 {rtScore}%
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center', flexShrink: 0 }}>
        {onMarkWatched && (
          <button
            onClick={onMarkWatched}
            className="vcr-btn"
            style={{ fontSize: 10, padding: '10px 10px', letterSpacing: 1, whiteSpace: 'nowrap', minHeight: 44, minWidth: 44 }}
          >
            ✓ WATCHED
          </button>
        )}
        {onRemoveFromQueue && (
          <button
            onClick={handleRemove}
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 2,
              color: 'var(--muted)', cursor: 'pointer', fontSize: 14, padding: '10px 10px',
              fontFamily: 'var(--font-mono)', lineHeight: 1, minHeight: 44, minWidth: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
