'use client'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Clock, Plus, Check, Tv, X } from 'lucide-react'
import { posterUrl, formatRuntime, calcFinishTime, type ProviderData } from '@/lib/utils'

interface VHSCardProps {
  tmdbId: number
  title: string
  posterPath: string | null
  mediaType: 'movie' | 'tv'
  runtime?: number | null
  releaseYear?: number | null
  imdbRating?: number | null
  rtScore?: number | null
  overview?: string | null
  isNew?: boolean
  isSoon?: boolean
  isStream?: boolean
  isReddit?: boolean
  redditVotes?: number
  isInQueue?: boolean
  isWatched?: boolean
  currentSeason?: number
  totalSeasons?: number
  onAddToQueue?: () => void
  onMarkWatched?: () => void
  onRemoveFromQueue?: () => void
  onDismiss?: () => void
  onClick?: () => void
  // Pass pre-fetched provider data from a parent that batched the request
  // (see /api/providers/batch). When omitted, the card falls back to its
  // own fetch — keep that fallback for any callers that don't batch yet.
  providerData?: ProviderData
}

export default function VHSCard({
  tmdbId, title, posterPath, mediaType, runtime, releaseYear,
  imdbRating, rtScore, overview,
  isNew, isSoon, isStream, isReddit, redditVotes,
  isInQueue, isWatched, currentSeason, totalSeasons,
  onAddToQueue, onMarkWatched, onRemoveFromQueue, onDismiss, onClick,
  providerData,
}: VHSCardProps) {
  const imgUrl = posterUrl(posterPath)
  const finish = runtime ? calcFinishTime(runtime) : null
  const [localAdded, setLocalAdded] = useState(false)
  const [synopsis, setSynopsis] = useState<string | null>(null)
  const [synopsisOpen, setSynopsisOpen] = useState(false)
  const [synopsisLoading, setSynopsisLoading] = useState(false)
  const [fetchedProviders, setFetchedProviders] = useState<{ providerId: number; providerName: string; logoPath: string }[]>([])
  const [fetchedOwnedProviders, setFetchedOwnedProviders] = useState<{ providerId: number; providerName: string; logoPath: string }[]>([])
  const [fetchedHasRent, setFetchedHasRent] = useState(false)
  const [fetchedHasBuy, setFetchedHasBuy]   = useState(false)
  const [selfFetchLoaded, setSelfFetchLoaded] = useState(false)

  // Only self-fetch when the parent hasn't already batched provider data for us.
  useEffect(() => {
    if (providerData) return
    let cancelled = false
    fetch(`/api/providers?tmdbId=${tmdbId}&mediaType=${mediaType}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        setFetchedProviders(d.providers ?? [])
        setFetchedOwnedProviders(d.ownedProviders ?? [])
        setFetchedHasRent(d.hasRent ?? false)
        setFetchedHasBuy(d.hasBuy ?? false)
        setSelfFetchLoaded(true)
      })
      .catch(() => !cancelled && setSelfFetchLoaded(true))
    return () => { cancelled = true }
  }, [tmdbId, mediaType, providerData])

  const providers       = providerData ? providerData.providers      : fetchedProviders
  const ownedProviders  = providerData ? providerData.ownedProviders : fetchedOwnedProviders
  const hasRent          = providerData ? providerData.hasRent   : fetchedHasRent
  const hasBuy           = providerData ? providerData.hasBuy    : fetchedHasBuy
  const providersLoaded  = providerData ? true : selfFetchLoaded

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation()
    setLocalAdded(true)
    onAddToQueue?.()
  }

  const handleUndoAdd = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLocalAdded(false)
    if (onRemoveFromQueue) {
      onRemoveFromQueue()
    } else {
      await fetch('/api/queue', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdbId, mediaType }),
      })
    }
  }

  const handlePosterClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (synopsisOpen) {
      setSynopsisOpen(false)
      return
    }
    if (overview) {
      setSynopsis(overview)
      setSynopsisOpen(true)
      return
    }
    if (synopsis) {
      setSynopsisOpen(true)
      return
    }
    // Fetch from API
    setSynopsisLoading(true)
    setSynopsisOpen(true)
    try {
      const data = await fetch(`/api/movie/${tmdbId}`).then(r => r.json())
      setSynopsis(data.overview ?? 'No synopsis available.')
    } catch {
      setSynopsis('No synopsis available.')
    } finally {
      setSynopsisLoading(false)
    }
  }

  const inQueue = isInQueue || localAdded

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
      <div className="relative" style={{ aspectRatio: '2/3', background: 'var(--raised)' }}
           onClick={handlePosterClick}>
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

        {/* Synopsis overlay */}
        {synopsisOpen && (
          <div className="absolute inset-0 z-20 flex flex-col p-3"
               style={{ background: 'rgba(8,6,4,0.93)', backdropFilter: 'blur(2px)' }}>
            <button
              onClick={e => { e.stopPropagation(); setSynopsisOpen(false) }}
              className="absolute top-2 right-2"
              style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}
            >
              <X size={12} />
            </button>
            <p className="font-bold mb-1.5" style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.1em' }}>
              SYNOPSIS
            </p>
            {synopsisLoading ? (
              <p style={{ color: 'var(--cream-dim)', fontSize: '0.62rem', fontFamily: 'var(--font-mono)' }}>LOADING...</p>
            ) : (
              <p style={{ color: 'var(--cream)', fontSize: '0.65rem', lineHeight: 1.5, overflow: 'auto' }}>
                {synopsis}
              </p>
            )}
          </div>
        )}

        {/* Badges */}
        {!synopsisOpen && (
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            {isNew   && <span className="badge-new">NEW</span>}
            {isSoon  && <span className="badge-soon">SOON</span>}
            {isReddit && <span className="badge-reddit">r/movies</span>}
            {mediaType === 'tv' && (
              <span className="flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded-sm"
                style={{ background: 'var(--forest)', color: '#A8C898', fontSize: '0.52rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                <Tv size={8} /> SHOW
              </span>
            )}
          </div>
        )}

        {/* Ratings */}
        {!synopsisOpen && (imdbRating || rtScore) && (
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
        {!synopsisOpen && (
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
        )}
      </div>

      {/* Provider strip — always rendered to normalize card heights */}
      <div style={{
        background: '#0E0C09', borderTop: '1px solid #1A1610',
        padding: '4px 8px', display: 'flex', gap: 4, alignItems: 'center',
        minHeight: 29,
      }}>
        {/* Own it: highlight the service they actually pay for */}
        {providersLoaded && ownedProviders.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div title={ownedProviders[0].providerName} style={{
              width: 18, height: 18, borderRadius: 3, overflow: 'hidden',
              flexShrink: 0, border: '1px solid var(--amber)',
            }}>
              <img
                src={`https://image.tmdb.org/t/p/w45${ownedProviders[0].logoPath}`}
                alt={ownedProviders[0].providerName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: 0.5, color: 'var(--amber)', fontWeight: 700 }}>
              ✓ {ownedProviders[0].providerName.toUpperCase()}{ownedProviders.length > 1 ? ` +${ownedProviders.length - 1}` : ''}
            </span>
          </div>
        )}

        {/* Don't own it streaming — point them to rent/buy instead */}
        {providersLoaded && ownedProviders.length === 0 && (hasRent || hasBuy) && (
          <div style={{ display: 'flex', gap: 4 }}>
            {hasRent && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: 0.5,
                color: 'var(--cream-dim)', background: 'rgba(228,204,144,0.07)',
                border: '1px solid rgba(228,204,144,0.15)',
                borderRadius: 2, padding: '2px 5px',
              }}>$ RENT</span>
            )}
            {hasBuy && !hasRent && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: 0.5,
                color: 'var(--muted)', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 2, padding: '2px 5px',
              }}>$$$ BUY</span>
            )}
          </div>
        )}

        {/* Streaming, but not on anything they own and no rent/buy — still worth knowing */}
        {providersLoaded && ownedProviders.length === 0 && !hasRent && !hasBuy && providers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, opacity: 0.55 }}>
            <div title={providers[0].providerName} style={{
              width: 18, height: 18, borderRadius: 3, overflow: 'hidden', flexShrink: 0,
            }}>
              <img
                src={`https://image.tmdb.org/t/p/w45${providers[0].logoPath}`}
                alt={providers[0].providerName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: 0.5, color: 'var(--muted)' }}>
              ON {providers[0].providerName.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* VHS Footer */}
      <div className="px-2.5 py-2.5 flex gap-2 items-center relative"
           style={{ background: '#0E0C09', borderTop: '2px solid #1A1610' }}>
        <span className="absolute right-2 bottom-2 text-xs" style={{ color: '#1A1610', letterSpacing: '4px', fontSize: '0.4rem' }}>● ●</span>

        {isWatched ? (
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)', fontSize: '0.6rem' }}>
            ✓ Watched
          </span>
        ) : localAdded && !isInQueue ? (
          <button
            onClick={handleUndoAdd}
            className="text-xs font-semibold tracking-widest uppercase flex items-center gap-1 w-full justify-center py-2"
            style={{ color: 'var(--amber)', fontSize: '0.6rem', background: 'transparent', border: '1px solid var(--amber)', borderRadius: '2px', cursor: 'pointer', opacity: 0.85 }}
            title="Click to undo"
          >
            <Check size={10} /> ADDED
          </button>
        ) : isInQueue ? (
          <>
            <button onClick={e => { e.stopPropagation(); onMarkWatched?.() }}
              className="vcr-btn text-xs px-2 py-2 flex-1" style={{ fontSize: '0.62rem' }}>
              ✓ WATCHED
            </button>
            {onRemoveFromQueue && (
              <button onClick={e => { e.stopPropagation(); onRemoveFromQueue?.() }}
                className="flex items-center justify-center w-9 h-9 rounded-sm"
                style={{ background: 'var(--raised)', border: '1px solid var(--border)', color: 'var(--muted)' }}
                title="Remove from queue">
                ✕
              </button>
            )}
          </>
        ) : isSoon ? (
          <button onClick={e => { e.stopPropagation(); onAddToQueue?.() }}
            className="vcr-btn text-xs px-2 py-2 w-full" style={{ fontSize: '0.62rem' }}>
            NOTIFY ME
          </button>
        ) : (
          <button
            onClick={handleAddToQueue}
            className="vcr-btn-primary text-xs px-2 py-2 w-full flex items-center justify-center gap-1"
            style={{ fontSize: '0.62rem' }}
          >
            <Plus size={10} /> ADD
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={e => { e.stopPropagation(); onDismiss() }}
          style={{
            display: 'block', width: '100%', background: 'none', border: 'none',
            color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
            letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
            padding: '12px 0', textAlign: 'center', opacity: 0.5,
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
        >
          ✕ not for me
        </button>
      )}
    </div>
  )
}
