'use client'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Clock, Plus, Check, Tv } from 'lucide-react'
import { posterUrl, formatRuntime, calcFinishTime, type ProviderData } from '@/lib/utils'
import TitleDetailModal from '@/components/modals/TitleDetailModal'

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
  isTrending?: boolean
  trendingCount?: number
  isInQueue?: boolean
  isWatched?: boolean
  currentSeason?: number
  totalSeasons?: number
  // "More from Denis Villeneuve" / "More with Tom Hardy" — set when a
  // suggestion came from the cast/crew engine, shown as a small badge
  matchReason?: string
  onAddToQueue?: () => void
  onMarkWatched?: () => void
  onRemoveFromQueue?: () => void
  onDismiss?: () => void
  onClick?: () => void
  // Pass pre-fetched provider data from a parent that batched the request
  // (see /api/providers/batch). When omitted, the card falls back to its
  // own fetch — keep that fallback for any callers that don't batch yet.
  providerData?: ProviderData
  // Set by a parent that owns batching for every card it renders, even
  // while its own batch request is still in flight (providerData is
  // undefined during that window too) — suppresses the self-fetch so
  // dozens of cards don't each fire /api/providers before the batch lands.
  batchManaged?: boolean
}

export default function VHSCard({
  tmdbId, title, posterPath, mediaType, runtime, releaseYear,
  imdbRating, rtScore, overview,
  isNew, isSoon, isTrending, trendingCount,
  isInQueue, isWatched, currentSeason, totalSeasons, matchReason,
  onAddToQueue, onMarkWatched, onRemoveFromQueue, onDismiss, onClick,
  providerData, batchManaged,
}: VHSCardProps) {
  const imgUrl = posterUrl(posterPath)
  const finish = runtime ? calcFinishTime(runtime) : null
  const [localAdded, setLocalAdded] = useState(false)
  // Click-to-expand: the card itself stays a fast scan (poster, title, year,
  // runtime, primary rating, badges, provider strip, one action button).
  // Everything else — full synopsis, both ratings spelled out, genre chips,
  // the complete provider list, cast/director/creators, trailer — lives in
  // TitleDetailModal, opened by tapping anywhere on the card.
  const [detailOpen, setDetailOpen] = useState(false)
  const [fetchedProviders, setFetchedProviders] = useState<{ providerId: number; providerName: string; logoPath: string }[]>([])
  const [fetchedOwnedProviders, setFetchedOwnedProviders] = useState<{ providerId: number; providerName: string; logoPath: string }[]>([])
  const [fetchedHasRent, setFetchedHasRent] = useState(false)
  const [fetchedHasBuy, setFetchedHasBuy]   = useState(false)
  const [selfFetchLoaded, setSelfFetchLoaded] = useState(false)

  // Only self-fetch when no parent owns batching for us. A batch-managed
  // card waits for providerData to arrive rather than firing its own
  // request during the window before the parent's batch resolves.
  useEffect(() => {
    if (providerData || batchManaged) return
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
  }, [tmdbId, mediaType, providerData, batchManaged])

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

  const handleCardMouseEnter = (e: React.MouseEvent) => {
    ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-5px) scale(1.015)'
    ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 16px 36px rgba(0,0,0,0.7), 0 0 20px rgba(192,120,24,0.12)'
  }

  const handleCardMouseLeave = (e: React.MouseEvent) => {
    ;(e.currentTarget as HTMLDivElement).style.transform = ''
    ;(e.currentTarget as HTMLDivElement).style.boxShadow = ''
  }

  const inQueue = isInQueue || localAdded

  return (
    <>
    <div
      className="rounded-sm overflow-hidden cursor-pointer group"
      style={{
        background: 'var(--card)',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
      }}
      onMouseEnter={handleCardMouseEnter}
      onMouseLeave={handleCardMouseLeave}
      onClick={() => { onClick?.(); setDetailOpen(true) }}
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
          {isNew   && <span className="badge-new">NEW</span>}
            {isSoon  && <span className="badge-soon">SOON</span>}
            {isTrending && <span className="badge-trending">TRENDING</span>}
            {mediaType === 'tv' && (
              <span className="flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded-sm"
                style={{ background: 'var(--forest)', color: '#C0E8AC', fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                <Tv size={8} /> SHOW
              </span>
            )}
            {matchReason && (
              <span
                title={matchReason}
                style={{
                  display: 'inline-block', maxWidth: 130, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  background: 'rgba(150,110,220,0.18)', color: '#C4A8F0',
                  border: '1px solid rgba(150,110,220,0.4)',
                  fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em',
                  textTransform: 'uppercase', padding: '1px 5px', borderRadius: '1px',
                }}
              >
                {matchReason}
              </span>
            )}
        </div>

        {/* Ratings */}
        {(imdbRating || rtScore) && (
          <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
            {imdbRating && (
              <span style={{ background: '#D4960A', color: '#0A0800', fontWeight: 700, fontSize: '0.6875rem', padding: '1px 5px', borderRadius: '1px', letterSpacing: '0.04em' }}>
                ★ {imdbRating}
              </span>
            )}
            {rtScore && (
              <span style={{ fontWeight: 700, fontSize: '0.6875rem', color: '#D0603C' }}>
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
            {releaseYear && <span className="text-xs" style={{ color: 'var(--cream-dim)' }}>{releaseYear}</span>}
            {runtime && <span className="text-xs" style={{ color: 'var(--cream-dim)' }}>{formatRuntime(runtime)}</span>}
            {mediaType === 'tv' && currentSeason && totalSeasons && (
              <span className="text-xs" style={{ color: 'var(--cream-dim)' }}>S{currentSeason}/{totalSeasons}</span>
            )}
          </div>
          {finish && !isSoon && (
            <div className="flex items-center gap-1 mt-1">
              <Clock size={9} style={{ color: 'var(--amber)' }} />
              <span className="text-xs" style={{ color: 'var(--amber)', fontSize: '0.6875rem' }}>
                Done by {finish.endTime}{finish.isLate ? ' +1' : ''}
              </span>
            </div>
          )}
          {isTrending && trendingCount && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--amber)', fontSize: '0.6875rem' }}>
              {trendingCount.toLocaleString()} watching now
            </p>
          )}
        </div>
      </div>

      {/* Provider strip — always rendered to normalize card heights */}
      <div style={{
        background: '#0E0C09', borderTop: '1px solid #1A1610',
        padding: '4px 8px', display: 'flex', gap: 4, alignItems: 'center',
        minHeight: 32,
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
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 0.5, color: 'var(--amber)', fontWeight: 700 }}>
              ✓ {ownedProviders[0].providerName.toUpperCase()}{ownedProviders.length > 1 ? ` +${ownedProviders.length - 1}` : ''}
            </span>
          </div>
        )}

        {/* Don't own it streaming — point them to rent/buy instead */}
        {providersLoaded && ownedProviders.length === 0 && (hasRent || hasBuy) && (
          <div style={{ display: 'flex', gap: 4 }}>
            {hasRent && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 0.5,
                color: 'var(--cream-dim)', background: 'rgba(228,204,144,0.07)',
                border: '1px solid rgba(228,204,144,0.15)',
                borderRadius: 2, padding: '2px 5px',
              }}>$ RENT</span>
            )}
            {hasBuy && !hasRent && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 0.5,
                color: 'var(--cream-dim)', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 2, padding: '2px 5px',
              }}>$$$ BUY</span>
            )}
          </div>
        )}

        {/* Streaming, but not on anything they own and no rent/buy — still worth knowing */}
        {providersLoaded && ownedProviders.length === 0 && !hasRent && !hasBuy && providers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div title={providers[0].providerName} style={{
              width: 18, height: 18, borderRadius: 3, overflow: 'hidden', flexShrink: 0,
            }}>
              <img
                src={`https://image.tmdb.org/t/p/w45${providers[0].logoPath}`}
                alt={providers[0].providerName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 0.5, color: 'var(--cream-dim)' }}>
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
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--cream-dim)', fontSize: '0.6875rem' }}>
            ✓ Watched
          </span>
        ) : localAdded && !isInQueue ? (
          <button
            onClick={handleUndoAdd}
            className="text-xs font-semibold tracking-widest uppercase flex items-center gap-1 w-full justify-center py-2"
            style={{ color: 'var(--amber)', fontSize: '0.6875rem', background: 'transparent', border: '1px solid var(--amber)', borderRadius: '2px', cursor: 'pointer' }}
            title="Click to undo"
          >
            <Check size={10} /> ADDED
          </button>
        ) : isInQueue ? (
          <>
            <button onClick={e => { e.stopPropagation(); onMarkWatched?.() }}
              className="vcr-btn text-xs px-2 py-2 flex-1" style={{ fontSize: '0.6875rem' }}>
              ✓ WATCHED
            </button>
            {onRemoveFromQueue && (
              <button onClick={e => { e.stopPropagation(); onRemoveFromQueue?.() }}
                className="flex items-center justify-center w-9 h-9 rounded-sm"
                style={{ background: 'var(--raised)', border: '1px solid var(--border)', color: 'var(--cream-dim)' }}
                title="Remove from queue">
                ✕
              </button>
            )}
          </>
        ) : isSoon ? (
          <button onClick={e => { e.stopPropagation(); onAddToQueue?.() }}
            className="vcr-btn text-xs px-2 py-2 w-full" style={{ fontSize: '0.6875rem' }}>
            NOTIFY ME
          </button>
        ) : (
          <button
            onClick={handleAddToQueue}
            className="vcr-btn-primary text-xs px-2 py-2 w-full flex items-center justify-center gap-1"
            style={{ fontSize: '0.6875rem' }}
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
            color: 'var(--cream-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem',
            letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
            padding: '12px 0', textAlign: 'center', opacity: 0.7,
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
        >
          ✕ not for me
        </button>
      )}
    </div>
    {detailOpen && (
      <TitleDetailModal
        tmdbId={tmdbId} title={title} posterPath={posterPath} mediaType={mediaType}
        runtime={runtime} releaseYear={releaseYear} imdbRating={imdbRating} rtScore={rtScore}
        overview={overview} matchReason={matchReason}
        currentSeason={currentSeason} totalSeasons={totalSeasons}
        isInQueue={inQueue} isWatched={isWatched} isSoon={isSoon}
        onAddToQueue={onAddToQueue ? () => { setLocalAdded(true); onAddToQueue() } : undefined}
        onMarkWatched={onMarkWatched}
        onRemoveFromQueue={onRemoveFromQueue}
        onClose={() => setDetailOpen(false)}
      />
    )}
    </>
  )
}
