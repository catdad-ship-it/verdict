'use client'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Play, Plus, Check, X, Tv, Pin, PinOff } from 'lucide-react'
import { posterUrl, formatRuntime, type ProviderData } from '@/lib/utils'
import { cachedFetch } from '@/lib/requestCache'
import type { TitleDetails } from '@/lib/tmdb'
import type { ContentWarning } from '@/lib/dtdd'
import ModalShell from '@/components/ui/ModalShell'

interface StreamProvider { providerId: number; providerName: string; logoPath: string }

interface TitleDetailModalProps {
  tmdbId: number
  title: string
  posterPath: string | null
  mediaType: 'movie' | 'tv'
  runtime?: number | null
  releaseYear?: number | null
  imdbRating?: number | null
  rtScore?: number | null
  overview?: string | null
  matchReason?: string
  currentSeason?: number
  totalSeasons?: number
  isInQueue?: boolean
  isWatched?: boolean
  isSoon?: boolean
  // "On Deck" pin — only meaningful for queue/list rows (see QueueRow),
  // VHSCard callers simply omit these and the button doesn't render.
  isPinned?: boolean
  onPin?: () => void
  onAddToQueue?: () => void
  onMarkWatched?: () => void
  onRemoveFromQueue?: () => void
  onClose: () => void
  // See VHSCard's prop of the same name — when onAddToQueue only opens a
  // destination picker rather than adding immediately, don't optimistically
  // flip to "ADDED" here either.
  usesPickerFlow?: boolean
  // Pass the card's already-resolved provider data (self-fetched or from
  // a batch) so this modal doesn't re-fetch /api/providers for a title
  // whose card is right there on screen.
  providerData?: ProviderData
}

// The click-to-expand detail sheet. Card-level info (poster, title, year,
// runtime, primary rating, badges, provider strip, one action button) stays
// on VHSCard for fast scanning — everything that needs more than a glance
// lives here: full synopsis, both ratings spelled out, genre chips, the
// complete provider list, cast/director/creators, and the trailer link.
// Bottom sheet on mobile / centered card on desktop, matching the existing
// PostWatchModal/ListPickerSheet pattern. Swipe down on the handle to
// dismiss — same Pointer Events drag-tracking approach QueueRow uses for
// its swipe actions, just vertical instead of horizontal.
export default function TitleDetailModal({
  tmdbId, title, posterPath, mediaType, runtime, releaseYear,
  imdbRating, rtScore, overview, matchReason, currentSeason, totalSeasons,
  isInQueue, isWatched, isSoon, isPinned, onPin,
  onAddToQueue, onMarkWatched, onRemoveFromQueue, onClose, usesPickerFlow, providerData,
}: TitleDetailModalProps) {
  const imgUrl = posterUrl(posterPath, 'w500')
  const [details, setDetails] = useState<TitleDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(true)
  const [fetchedProviders, setFetchedProviders] = useState<StreamProvider[]>([])
  const [fetchedOwnedProviders, setFetchedOwnedProviders] = useState<StreamProvider[]>([])
  const [fetchedHasRent, setFetchedHasRent] = useState(false)
  const [fetchedHasBuy, setFetchedHasBuy] = useState(false)
  const [fetchedProvidersLoaded, setFetchedProvidersLoaded] = useState(false)
  // Prefer the card's already-resolved data over this modal's own fetch —
  // see the providerData prop doc above.
  const providers      = providerData ? providerData.providers      : fetchedProviders
  const ownedProviders = providerData ? providerData.ownedProviders : fetchedOwnedProviders
  const hasRent        = providerData ? providerData.hasRent        : fetchedHasRent
  const hasBuy         = providerData ? providerData.hasBuy         : fetchedHasBuy
  const providersLoaded = providerData ? true : fetchedProvidersLoaded
  const [trailerLoading, setTrailerLoading] = useState(false)
  const [localAdded, setLocalAdded] = useState(false)
  // Transparent title-logo art (fanart.tv) — falls back to the plain text
  // title below when there's no key configured or no art for this title.
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  // Content warnings (Does The Dog Die) — community yes/no vote totals per
  // trigger topic. Empty array is the normal "unconfigured or no data"
  // state, not an error; the section just doesn't render.
  const [warnings, setWarnings] = useState<ContentWarning[]>([])

  useEffect(() => {
    let cancelled = false
    const key = `${mediaType}:${tmdbId}`
    cachedFetch(`details:${key}`, () => fetch(`/api/details?tmdbId=${tmdbId}&mediaType=${mediaType}`).then(r => r.json()))
      .then(d => { if (!cancelled) setDetails(d) })
      .catch(() => { /* non-fatal — fall back to card-level overview below */ })
      .finally(() => { if (!cancelled) setDetailsLoading(false) })

    // Skip the fetch entirely when the card that opened this modal already
    // resolved provider data (its own self-fetch or a parent's batch).
    if (!providerData) {
      cachedFetch(`providers:${key}`, () => fetch(`/api/providers?tmdbId=${tmdbId}&mediaType=${mediaType}`).then(r => r.json()))
        .then(d => {
          if (cancelled) return
          setFetchedProviders(d.providers ?? [])
          setFetchedOwnedProviders(d.ownedProviders ?? [])
          setFetchedHasRent(d.hasRent ?? false)
          setFetchedHasBuy(d.hasBuy ?? false)
          setFetchedProvidersLoaded(true)
        })
        .catch(() => !cancelled && setFetchedProvidersLoaded(true))
    }

    cachedFetch(`logo:${key}`, () => fetch(`/api/logo?tmdbId=${tmdbId}&mediaType=${mediaType}`).then(r => r.json()))
      .then(d => { if (!cancelled) setLogoUrl(d.logoUrl ?? null) })
      .catch(() => { /* non-fatal — plain text title stays */ })
    cachedFetch(`warnings:${key}`, () => fetch(`/api/content-warnings?tmdbId=${tmdbId}&mediaType=${mediaType}`).then(r => r.json()))
      .then(d => { if (!cancelled) setWarnings(d.warnings ?? []) })
      .catch(() => { /* non-fatal — section just doesn't render */ })
    return () => { cancelled = true }
  }, [tmdbId, mediaType, providerData])

  // Trailer plays inline (a YouTube iframe embed dropped into the sheet)
  // instead of punting the user out to youtube.com — the whole point of
  // this modal is "get everything without leaving the flow."
  const [trailerKey, setTrailerKey] = useState<string | null>(null)
  const [trailerNotFound, setTrailerNotFound] = useState(false)

  const handleTrailer = async () => {
    setTrailerLoading(true)
    try {
      const data = await fetch(`/api/trailer?tmdbId=${tmdbId}&mediaType=${mediaType}`).then(r => r.json())
      if (data.key) setTrailerKey(data.key)
      else setTrailerNotFound(true)
    } catch {
      setTrailerNotFound(true)
    } finally {
      setTrailerLoading(false)
    }
  }

  const handleAdd = () => { if (!usesPickerFlow) setLocalAdded(true); onAddToQueue?.() }
  const inQueue = isInQueue || localAdded

  // Swipe-down-to-dismiss, engaged only from the drag handle strip so it
  // never fights with the sheet's own internal scroll.
  const SWIPE_CLOSE_THRESHOLD = 110
  const dragRef = useRef({ startY: 0, pointerId: null as number | null, active: false })
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [closing, setClosing] = useState(false)

  const handlePointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startY: e.clientY, pointerId: e.pointerId, active: true }
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ }
  }
  const handlePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d.active || d.pointerId !== e.pointerId) return
    const dy = Math.max(0, e.clientY - d.startY) // only allow dragging down
    setIsDragging(true)
    setDragY(dy)
  }
  const handlePointerEnd = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d.active || d.pointerId !== e.pointerId) return
    d.active = false
    setIsDragging(false)
    if (dragY >= SWIPE_CLOSE_THRESHOLD) {
      setClosing(true)
      setTimeout(onClose, 180)
    } else {
      setDragY(0)
    }
  }

  const subtitle = [
    releaseYear ? String(releaseYear) : null,
    runtime ? formatRuntime(runtime) : null,
    mediaType === 'tv' && currentSeason && totalSeasons ? `S${currentSeason}/${totalSeasons}` : null,
  ].filter(Boolean).join(' · ')

  const genres = details?.genres ?? []
  const synopsis = details?.overview || overview || null

  return (
    <div
      className="fixed inset-0 flex flex-col justify-end md:justify-center md:items-center md:p-4"
      style={{ background: 'rgba(0,0,0,0.88)', zIndex: 60 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <ModalShell
        onClose={onClose}
        label={title}
        className="w-full md:max-w-lg rounded-t-2xl md:rounded-sm relative overflow-y-auto"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--amber)',
          boxShadow: '0 30px 70px rgba(0,0,0,0.7), 0 0 40px rgba(192,120,24,0.1)',
          maxHeight: '90dvh',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)',
          transform: closing ? 'translateY(100%)' : `translateY(${dragY}px)`,
          opacity: closing ? 0 : 1,
          transition: isDragging ? 'none' : 'transform 0.2s ease, opacity 0.18s ease',
        }}
      >
        {/* Drag handle — swipe down from here to dismiss (mobile only) */}
        <div
          className="md:hidden flex justify-center pt-3 pb-1"
          style={{ touchAction: 'none', cursor: 'grab' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          <div className="w-10 h-1.5 rounded-full" style={{ background: 'var(--border-lt)' }} />
        </div>

        <button onClick={onClose} className="absolute top-3 right-4" style={{ background: 'none', border: 'none', color: 'var(--cream-dim)', cursor: 'pointer', padding: 4 }}>
          <X size={18} />
        </button>

        <div className="p-5 md:p-7">
          {/* Header: poster + identity */}
          <div className="flex gap-4 mb-4">
            <div style={{ width: 84, flexShrink: 0, borderRadius: 4, overflow: 'hidden', position: 'relative', aspectRatio: '2/3', background: 'var(--raised)' }}>
              {imgUrl ? (
                <Image src={imgUrl} alt={title} fill className="object-cover" sizes="84px" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center"><span style={{ fontSize: '1.75rem', opacity: 0.15 }}>🎬</span></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {logoUrl ? (
                <div style={{ height: 34, marginBottom: 6 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- variable aspect ratio transparent logo art, not a fixed-size photo */}
                  <img src={logoUrl} alt={title} style={{ height: '100%', maxWidth: '100%', objectFit: 'contain', objectPosition: 'left center', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }} />
                </div>
              ) : (
                <h3 className="font-bold leading-tight mb-1" style={{ color: 'var(--cream)', fontSize: 19 }}>{title}</h3>
              )}
              {subtitle && <p style={{ color: 'var(--cream-dim)', fontSize: 13, marginBottom: 8 }}>{subtitle}</p>}
              <div className="flex items-center gap-2 flex-wrap">
                {imdbRating != null && (
                  <span style={{ background: '#D4960A', color: '#0A0800', fontWeight: 700, fontSize: 12, padding: '2px 6px', borderRadius: 2 }}>
                    ★ {imdbRating} <span style={{ fontWeight: 400 }}>IMDb</span>
                  </span>
                )}
                {rtScore != null && (
                  <span style={{ fontWeight: 700, fontSize: 12, color: '#D0603C' }}>🍅 {rtScore}% <span style={{ fontWeight: 400, color: 'var(--cream-dim)' }}>RT</span></span>
                )}
                {mediaType === 'tv' && (
                  <span className="flex items-center gap-1" style={{ background: 'var(--forest)', color: '#C0E8AC', fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 2, fontWeight: 700 }}>
                    <Tv size={10} /> Show
                  </span>
                )}
              </div>
              {matchReason && (
                <p style={{ marginTop: 8, color: '#C4A8F0', fontSize: 12, fontWeight: 600 }}>{matchReason}</p>
              )}
            </div>
          </div>

          {/* Genres */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {genres.map(g => (
                <span key={g} style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.04em',
                  color: 'var(--cream-dim)', background: 'var(--raised)',
                  border: '1px solid var(--border)', borderRadius: 3, padding: '3px 8px',
                }}>{g}</span>
              ))}
            </div>
          )}

          {/* Synopsis */}
          <div className="mb-5">
            {detailsLoading && !synopsis ? (
              <p style={{ color: 'var(--cream-dim)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>LOADING...</p>
            ) : (
              <p style={{ color: 'var(--cream)', fontSize: 14, lineHeight: 1.65 }}>
                {synopsis || 'No synopsis available.'}
              </p>
            )}
          </div>

          {/* Cast / director / creators */}
          {details && (details.director || details.creators.length > 0 || details.cast.length > 0) && (
            <div className="mb-5" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {details.director && (
                <p style={{ fontSize: 12.5, color: 'var(--cream-dim)' }}>
                  <span style={{ color: 'var(--amber)', fontWeight: 700 }}>Director </span>{details.director}
                </p>
              )}
              {details.creators.length > 0 && (
                <p style={{ fontSize: 12.5, color: 'var(--cream-dim)' }}>
                  <span style={{ color: 'var(--amber)', fontWeight: 700 }}>Created by </span>{details.creators.join(', ')}
                </p>
              )}
              {details.cast.length > 0 && (
                <p style={{ fontSize: 12.5, color: 'var(--cream-dim)' }}>
                  <span style={{ color: 'var(--amber)', fontWeight: 700 }}>Starring </span>{details.cast.join(', ')}
                </p>
              )}
            </div>
          )}

          {/* Content notes (Does The Dog Die) — community-sourced trigger
              warnings, only rendered when there's actually data to show. */}
          {warnings.length > 0 && (
            <div className="mb-5">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 700 }}>CONTENT NOTES</p>
              <div className="flex flex-col gap-1.5">
                {warnings.map(w => {
                  const total = w.yes + w.no
                  const yesPct = Math.round((w.yes / total) * 100)
                  return (
                    <div key={w.topicName} className="flex items-center justify-between gap-3">
                      <span style={{ fontSize: 12.5, color: 'var(--cream-dim)' }}>{w.topicName}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: yesPct >= 50 ? '#D0603C' : 'var(--cream-dim)', flexShrink: 0 }}>
                        {yesPct}% yes ({total})
                      </span>
                    </div>
                  )
                })}
              </div>
              <p style={{ fontSize: 11, color: 'var(--cream-dim)', marginTop: 6 }}>
                Community-sourced via Does the Dog Die — may be incomplete.
              </p>
            </div>
          )}

          {/* Where to watch — full list, not just the first logo */}
          <div className="mb-5">
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 700 }}>WHERE TO WATCH</p>
            {!providersLoaded ? (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)' }}>LOADING...</p>
            ) : ownedProviders.length > 0 || providers.length > 0 || hasRent || hasBuy ? (
              <div className="flex flex-col gap-3">
                {ownedProviders.length > 0 && (
                  <div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--amber)', letterSpacing: 1, marginBottom: 4 }}>ON YOUR SERVICES</p>
                    <div className="flex flex-wrap gap-2">
                      {ownedProviders.map(p => (
                        <div key={p.providerId} title={p.providerName} style={{ width: 30, height: 30, borderRadius: 5, overflow: 'hidden', border: '1px solid var(--amber)' }}>
                          <img src={`https://image.tmdb.org/t/p/w45${p.logoPath}`} alt={p.providerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {providers.filter(p => !ownedProviders.some(o => o.providerId === p.providerId)).length > 0 && (
                  <div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cream-dim)', letterSpacing: 1, marginBottom: 4 }}>ALSO STREAMING</p>
                    <div className="flex flex-wrap gap-2">
                      {providers.filter(p => !ownedProviders.some(o => o.providerId === p.providerId)).map(p => (
                        <div key={p.providerId} title={p.providerName} style={{ width: 30, height: 30, borderRadius: 5, overflow: 'hidden', border: '1px solid var(--border)' }}>
                          <img src={`https://image.tmdb.org/t/p/w45${p.logoPath}`} alt={p.providerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(hasRent || hasBuy) && (
                  <div className="flex gap-2">
                    {hasRent && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)', background: 'rgba(228,204,144,0.07)', border: '1px solid rgba(228,204,144,0.15)', borderRadius: 2, padding: '3px 8px' }}>$ RENT</span>}
                    {hasBuy && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, padding: '3px 8px' }}>$$$ BUY</span>}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)', letterSpacing: 1 }}>NOT STREAMING IN US</p>
            )}
          </div>

          {/* Trailer — plays inline once fetched, no tab-out */}
          {trailerKey ? (
            <div className="mb-4" style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: 3, overflow: 'hidden' }}>
              <iframe
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
                title="Trailer"
                allow="accelerometer; encrypted-media; picture-in-picture; autoplay"
                allowFullScreen
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          ) : (
            <button
              onClick={handleTrailer}
              disabled={trailerLoading || trailerNotFound}
              className="flex items-center justify-center gap-2 w-full mb-4"
              style={{
                background: 'var(--raised)', border: '1px solid var(--amber-dim)',
                borderRadius: 3, color: trailerNotFound ? 'var(--cream-dim)' : 'var(--amber)', cursor: trailerNotFound ? 'default' : 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: 1,
                padding: '11px 12px', opacity: trailerLoading ? 0.5 : 1,
              }}
            >
              <Play size={12} fill="currentColor" />
              {trailerLoading ? 'LOADING...' : trailerNotFound ? 'NO TRAILER AVAILABLE' : 'WATCH TRAILER'}
            </button>
          )}

          {/* Primary action — mirrors the card's footer state */}
          {isWatched ? (
            <div className="flex items-center justify-center gap-2 py-3" style={{ color: 'var(--cream-dim)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: 1 }}>
              <Check size={14} /> WATCHED
            </div>
          ) : inQueue ? (
            <div className="flex gap-2">
              {onMarkWatched && (
                <button onClick={() => onMarkWatched()} className="vcr-btn flex-1 py-3" style={{ fontSize: 12 }}>
                  ✓ MARK WATCHED
                </button>
              )}
              {onPin && (
                <button
                  onClick={() => onPin()}
                  className="flex items-center justify-center gap-2"
                  style={{
                    padding: '0 14px',
                    background: isPinned ? 'rgba(192,120,24,0.12)' : 'var(--raised)',
                    border: `1px solid ${isPinned ? 'var(--amber)' : 'var(--border)'}`,
                    color: isPinned ? 'var(--amber)' : 'var(--cream-dim)',
                    borderRadius: 3, cursor: 'pointer',
                    fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1,
                  }}
                  title={isPinned ? 'Remove from On Deck' : 'Pin as On Deck'}
                >
                  {isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                </button>
              )}
              {onRemoveFromQueue && (
                <button onClick={() => { onRemoveFromQueue(); onClose() }} className="flex items-center justify-center" style={{ width: 46, background: 'var(--raised)', border: '1px solid var(--border)', color: 'var(--cream-dim)', borderRadius: 3, cursor: 'pointer' }} title="Remove from queue">
                  ✕
                </button>
              )}
            </div>
          ) : isSoon ? (
            <button onClick={() => onAddToQueue?.()} className="vcr-btn w-full py-3" style={{ fontSize: 12 }}>
              NOTIFY ME
            </button>
          ) : (
            <button onClick={handleAdd} className="vcr-btn-primary w-full py-3 flex items-center justify-center gap-2" style={{ fontSize: 12 }}>
              <Plus size={13} /> ADD TO QUEUE
            </button>
          )}
        </div>
      </ModalShell>
    </div>
  )
}
