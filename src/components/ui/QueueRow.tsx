'use client'
import Image from 'next/image'
import { useState } from 'react'
import { Clock, ChevronDown, ChevronUp, Play } from 'lucide-react'
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

  const [expanded, setExpanded]         = useState(false)
  const [synopsis, setSynopsis]         = useState<string | null>(overview ?? null)
  const [synopsisLoading, setSynopsisLoading] = useState(false)
  const [trailerLoading, setTrailerLoading]   = useState(false)
  const [removing, setRemoving]               = useState(false)

  const handleExpand = async () => {
    const next = !expanded
    setExpanded(next)
    // Lazy-fetch synopsis if not in props
    if (next && !synopsis) {
      setSynopsisLoading(true)
      try {
        const path = mediaType === 'tv' ? `/api/show/${tmdbId}` : `/api/movie/${tmdbId}`
        const data = await fetch(path).then(r => r.json())
        setSynopsis(data.overview ?? null)
      } catch { /* non-fatal */ }
      finally { setSynopsisLoading(false) }
    }
  }

  const handleTrailer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setTrailerLoading(true)
    try {
      const data = await fetch(`/api/trailer?tmdbId=${tmdbId}&mediaType=${mediaType}`).then(r => r.json())
      if (data.url) window.open(data.url, '_blank', 'noopener')
    } finally {
      setTrailerLoading(false)
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setRemoving(true)
    onRemoveFromQueue?.()
  }

  const handleWatched = (e: React.MouseEvent) => {
    e.stopPropagation()
    onMarkWatched?.()
  }

  return (
    <div style={{
      borderBottom: '1px solid var(--border)',
      opacity: removing ? 0.4 : 1, transition: 'opacity 0.2s',
    }}>
      {/* Main row — tap anywhere except buttons to expand */}
      <div
        onClick={handleExpand}
        style={{ display: 'flex', gap: 12, padding: '10px 0', cursor: 'pointer' }}
      >
        {/* Poster */}
        <div style={{
          width: 60, flexShrink: 0, borderRadius: 2, overflow: 'hidden',
          position: 'relative', aspectRatio: '2/3', background: 'var(--raised)',
        }}>
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
          <p style={{
            fontWeight: 700, fontSize: 14, color: 'var(--cream)', margin: 0,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: 0.2,
          }}>
            {title}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {releaseYear && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>{releaseYear}</span>}
            {runtime    && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>{formatRuntime(runtime)}</span>}
            {mediaType === 'tv' && currentSeason && totalSeasons && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>S{currentSeason}/{totalSeasons}</span>
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
              {imdbRating && <span style={{ background: '#D4960A', color: '#0A0800', fontWeight: 700, fontSize: 9, padding: '1px 4px', borderRadius: 1 }}>★ {imdbRating}</span>}
              {rtScore    && <span style={{ fontWeight: 700, fontSize: 10, color: '#D0603C' }}>🍅 {rtScore}%</span>}
            </div>
          )}
        </div>

        {/* Chevron + action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: 'var(--muted)', marginBottom: 2 }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
          {onMarkWatched && (
            <button onClick={handleWatched} className="vcr-btn"
              style={{ fontSize: 10, padding: '10px', letterSpacing: 1, whiteSpace: 'nowrap', minHeight: 44, minWidth: 44 }}>
              ✓ WATCHED
            </button>
          )}
          {onRemoveFromQueue && (
            <button onClick={handleRemove}
              style={{
                background: 'none', border: '1px solid var(--border)', borderRadius: 2,
                color: 'var(--muted)', cursor: 'pointer', fontSize: 14, padding: '10px',
                fontFamily: 'var(--font-mono)', lineHeight: 1, minHeight: 44, minWidth: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
            >✕</button>
          )}
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div style={{ paddingLeft: 72, paddingBottom: 14, paddingRight: 4 }}>
          {synopsisLoading ? (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>LOADING...</p>
          ) : synopsis ? (
            <p style={{ fontSize: 12, color: 'var(--cream-dim)', lineHeight: 1.6, margin: '0 0 10px' }}>{synopsis}</p>
          ) : (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', marginBottom: 10 }}>No description available.</p>
          )}
          <button
            onClick={handleTrailer}
            disabled={trailerLoading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--raised)', border: '1px solid var(--amber-dim)',
              borderRadius: 3, color: 'var(--amber)', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1,
              padding: '7px 12px', opacity: trailerLoading ? 0.5 : 1,
            }}
          >
            <Play size={10} fill="currentColor" />
            {trailerLoading ? 'LOADING...' : 'WATCH TRAILER'}
          </button>
        </div>
      )}
    </div>
  )
}
