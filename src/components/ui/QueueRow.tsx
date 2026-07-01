'use client'
import Image from 'next/image'
import { useState, useRef } from 'react'
import { Clock, ChevronDown, ChevronUp, Play, Pin, PinOff, Check, X } from 'lucide-react'
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
  isPinned?: boolean
  onPin?: () => void
  onMarkWatched?: () => void
  onRemoveFromQueue?: () => void
}

export default function QueueRow({
  tmdbId, title, posterPath, mediaType, runtime, releaseYear,
  imdbRating, rtScore, overview,
  currentSeason, totalSeasons,
  isPinned, onPin,
  onMarkWatched, onRemoveFromQueue,
}: QueueRowProps) {
  const imgUrl = posterUrl(posterPath)
  const finish = runtime ? calcFinishTime(runtime) : null

  const [expanded, setExpanded]           = useState(false)
  const [synopsis, setSynopsis]         = useState<string | null>(overview ?? null)
  const [synopsisLoading, setSynopsisLoading] = useState(false)
  const [trailerLoading, setTrailerLoading]   = useState(false)
  const [removing, setRemoving]               = useState(false)
  const [providers, setProviders]             = useState<{ providerId: number; providerName: string; logoPath: string }[] | null>(null)
  const [ownedProviders, setOwnedProviders]   = useState<{ providerId: number; providerName: string; logoPath: string }[]>([])
  const [hasRent, setHasRent] = useState(false)
  const [hasBuy, setHasBuy]   = useState(false)

  // Swipe right = mark watched, swipe left = dismiss (remove from queue/list).
  // Pointer Events unify mouse + touch; `touch-action: pan-y` on the draggable
  // layer keeps vertical page scroll working while we own horizontal drags.
  const SWIPE_THRESHOLD = 96
  const MAX_DRAG = 140
  const dragRef = useRef({ startX: 0, startY: 0, pointerId: null as number | null, locked: false, active: false })
  const suppressClickRef = useRef(false)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [exitingRemove, setExitingRemove] = useState(false)

  const handlePointerDown = (e: React.PointerEvent) => {
    if (expanded || removing || exitingRemove) return
    if ((e.target as HTMLElement).closest('button')) return
    dragRef.current = { startX: e.clientX, startY: e.clientY, pointerId: e.pointerId, locked: false, active: true }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d.active || d.pointerId !== e.pointerId) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.locked) {
      // Not enough movement yet to tell a tap from a drag
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      // More vertical than horizontal — this is a scroll, not a swipe
      if (Math.abs(dy) > Math.abs(dx)) { d.active = false; return }
      d.locked = true
      setIsDragging(true)
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ }
    }
    let next = dx
    if (next > 0 && !onMarkWatched) next = 0
    if (next < 0 && !onRemoveFromQueue) next = 0
    next = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, next))
    setDragX(next)
  }

  const handlePointerEnd = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d.active || d.pointerId !== e.pointerId) return
    d.active = false
    if (!d.locked) return // was just a tap — let the normal onClick handle it
    setIsDragging(false)
    suppressClickRef.current = true
    if (dragX >= SWIPE_THRESHOLD && onMarkWatched) {
      setDragX(0)
      onMarkWatched()
    } else if (dragX <= -SWIPE_THRESHOLD && onRemoveFromQueue) {
      setExitingRemove(true)
      setRemoving(true)
      onRemoveFromQueue()
    } else {
      setDragX(0)
    }
  }

  const handleExpand = async () => {
    if (suppressClickRef.current) { suppressClickRef.current = false; return }
    const next = !expanded
    setExpanded(next)
    // Lazy-fetch synopsis + providers if not already loaded
    if (next) {
      if (!synopsis) {
        setSynopsisLoading(true)
        try {
          const p = mediaType === 'tv' ? `/api/show/${tmdbId}` : `/api/movie/${tmdbId}`
          const data = await fetch(p).then(r => r.json())
          setSynopsis(data.overview ?? null)
        } catch { /* non-fatal */ }
        finally { setSynopsisLoading(false) }
      }
      if (providers === null) {
        fetch(`/api/providers?tmdbId=${tmdbId}&mediaType=${mediaType}`)
          .then(r => r.json())
          .then(d => {
            setProviders(d.providers ?? [])
            setOwnedProviders(d.ownedProviders ?? [])
            setHasRent(d.hasRent ?? false)
            setHasBuy(d.hasBuy ?? false)
          })
          .catch(() => setProviders([]))
      }
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
    <div style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--border)' }}>
      {/* Swipe action background — revealed as the row underneath slides away */}
      {dragX !== 0 && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: dragX > 0 ? 'flex-start' : 'flex-end', padding: '0 22px',
          background: dragX > 0 ? '#1F3D28' : '#4A1616',
        }}>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1.5, fontWeight: 700,
            color: dragX > 0 ? '#A8C898' : '#F0A8A8',
            opacity: Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1),
          }}>
            {dragX > 0 ? <><Check size={16} /> WATCHED</> : <>DISMISS <X size={16} /></>}
          </span>
        </div>
      )}

      {/* Draggable foreground — swipe right = watched, swipe left = dismiss */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        style={{
          position: 'relative', background: 'var(--bg)',
          transform: exitingRemove ? 'translateX(-120%)' : `translateX(${dragX}px)`,
          opacity: exitingRemove ? 0 : (removing ? 0.4 : 1),
          transition: isDragging ? 'none' : 'transform 0.25s ease, opacity 0.25s ease',
          touchAction: 'pan-y',
          userSelect: isDragging ? 'none' : undefined,
        }}
      >
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <p style={{
              fontWeight: 700, fontSize: 14, color: 'var(--cream)', margin: 0,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: 0.2,
              flex: 1, minWidth: 0,
            }}>
              {title}
            </p>
            {isPinned && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: 1,
                color: 'var(--amber)', background: 'rgba(192,120,24,0.15)',
                border: '1px solid rgba(192,120,24,0.4)',
                borderRadius: 2, padding: '1px 4px', flexShrink: 0,
              }}>ON DECK</span>
            )}
          </div>
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
          {/* Where to watch — prioritize services they actually pay for */}
          {providers !== null && (
            <div style={{ marginBottom: 10 }}>
              {ownedProviders.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--amber)', letterSpacing: 1, fontWeight: 700 }}>✓ ON YOUR SERVICES:</span>
                  {ownedProviders.map(p => (
                    <div key={p.providerId} title={p.providerName} style={{
                      width: 24, height: 24, borderRadius: 4, overflow: 'hidden',
                      position: 'relative', flexShrink: 0,
                      border: '1px solid var(--amber)',
                    }}>
                      <img
                        src={`https://image.tmdb.org/t/p/w45${p.logoPath}`}
                        alt={p.providerName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ))}
                </div>
              ) : hasRent || hasBuy ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>NOT ON YOUR SERVICES:</span>
                  {hasRent && (
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 0.5,
                      color: 'var(--cream-dim)', background: 'rgba(228,204,144,0.07)',
                      border: '1px solid rgba(228,204,144,0.15)', borderRadius: 2, padding: '2px 6px',
                    }}>$ RENT</span>
                  )}
                  {hasBuy && (
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 0.5,
                      color: 'var(--muted)', background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, padding: '2px 6px',
                    }}>$$$ BUY</span>
                  )}
                </div>
              ) : providers.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', opacity: 0.55 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>STREAMING (NOT YOUR SERVICE):</span>
                  {providers.slice(0, 4).map(p => (
                    <div key={p.providerId} title={p.providerName} style={{
                      width: 24, height: 24, borderRadius: 4, overflow: 'hidden',
                      position: 'relative', flexShrink: 0,
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}>
                      <img
                        src={`https://image.tmdb.org/t/p/w45${p.logoPath}`}
                        alt={p.providerName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>NOT STREAMING IN US</span>
              )}
            </div>
          )}
          {providers === null && (
            <div style={{ marginBottom: 10, height: 10 }} />
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
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
          {onPin && (
            <button
              onClick={e => { e.stopPropagation(); onPin() }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: isPinned ? 'rgba(192,120,24,0.12)' : 'var(--raised)',
                border: `1px solid ${isPinned ? 'var(--amber)' : 'var(--border)'}`,
                borderRadius: 3,
                color: isPinned ? 'var(--amber)' : 'var(--muted)',
                cursor: 'pointer', fontFamily: 'var(--font-mono)',
                fontSize: 10, letterSpacing: 1, padding: '7px 12px',
              }}
            >
              {isPinned ? <PinOff size={10} /> : <Pin size={10} />}
              {isPinned ? 'UNPIN' : 'ON DECK'}
            </button>
          )}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
