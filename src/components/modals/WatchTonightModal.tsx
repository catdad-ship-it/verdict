'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, RefreshCw, Pin } from 'lucide-react'
import { posterUrl } from '@/lib/utils'
import type { QueueItem } from '@/lib/types'

interface Props {
  items: QueueItem[]
  onPin: (key: string) => void
  onClose: () => void
}

const TIME_OPTIONS = [
  { label: '60 MIN',  minutes: 60 },
  { label: '90 MIN',  minutes: 90 },
  { label: '2 HRS',   minutes: 120 },
  { label: '2.5 HRS', minutes: 150 },
  { label: '3+ HRS',  minutes: Infinity },
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function WatchTonightModal({ items, onPin, onClose }: Props) {
  const [limit, setLimit]           = useState<number | null>(null)
  const [candidates, setCandidates] = useState<QueueItem[]>([])
  const [pickIdx, setPickIdx]       = useState(0)
  const [pinned, setPinned]         = useState(false)

  // Recompute candidates whenever limit changes
  useEffect(() => {
    if (limit === null) { setCandidates([]); setPickIdx(0); setPinned(false); return }
    const filtered = items.filter(i => {
      if (limit === Infinity) return true          // 3+ hrs: show everything
      if (!i.runtime) return false                 // unknown runtime excluded for shorter slots
      return i.runtime <= limit + 15              // 15-min grace buffer
    })
    setCandidates(shuffle(filtered))
    setPickIdx(0)
    setPinned(false)
  }, [limit, items])

  const pick = candidates[pickIdx] ?? null

  const handlePickAgain = () => {
    setPickIdx(i => (i + 1) % Math.max(candidates.length, 1))
    setPinned(false)
  }

  const handleOnDeck = () => {
    if (!pick) return
    onPin(`${pick.tmdbId}-${pick.mediaType}`)
    setPinned(true)
  }

  const imgUrl = pick ? posterUrl(pick.posterPath) : null

  return (
    <div
      className="fixed inset-0 flex flex-col justify-end md:justify-center md:items-center md:p-4"
      style={{ background: 'rgba(0,0,0,0.88)', zIndex: 60 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full md:max-w-sm rounded-t-2xl md:rounded-sm relative overflow-hidden"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--amber)',
          boxShadow: '0 30px 70px rgba(0,0,0,0.7), 0 0 40px rgba(192,120,24,0.08)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)',
          maxHeight: '88dvh', overflowY: 'auto',
        }}
      >
        {/* Drag handle */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-8 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        <button onClick={onClose} className="absolute top-3 right-4"
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
          <X size={16} />
        </button>

        <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
          {/* Header */}
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--amber)', letterSpacing: 3, marginBottom: 4 }}>
            ◼ WHAT DO YOU HAVE TONIGHT?
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', marginBottom: '1.25rem' }}>
            Pick your window — I'll find something that fits.
          </p>

          {/* Time selector */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {TIME_OPTIONS.map(({ label, minutes }) => {
              const active = limit === minutes
              return (
                <button key={label} onClick={() => setLimit(minutes)} style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11, padding: '0.4rem 0.75rem',
                  background: active ? 'var(--amber)' : 'var(--raised)',
                  color: active ? 'var(--bg)' : 'var(--cream-dim)',
                  border: `1px solid ${active ? 'var(--amber)' : 'var(--border)'}`,
                  borderRadius: 3, cursor: 'pointer', letterSpacing: 1, fontWeight: active ? 700 : 400,
                }}>{label}</button>
              )
            })}
          </div>

          {/* Pick result */}
          {limit !== null && (
            <>
              {candidates.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '2rem 1rem',
                  fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)',
                }}>
                  Nothing in your queue fits that window.<br />
                  <span style={{ color: 'var(--cream-dim)', marginTop: 4, display: 'block' }}>
                    Try a longer time or add some titles.
                  </span>
                </div>
              ) : pick ? (
                <>
                  {/* Title card */}
                  <div style={{
                    display: 'flex', gap: 14, padding: '1rem',
                    background: 'var(--raised)', borderRadius: 4,
                    border: `1px solid ${pinned ? 'var(--amber)' : 'var(--border)'}`,
                    marginBottom: '1rem', transition: 'border-color 0.2s',
                  }}>
                    {/* Poster */}
                    <div style={{
                      width: 64, flexShrink: 0, borderRadius: 2, overflow: 'hidden',
                      position: 'relative', aspectRatio: '2/3', background: 'var(--surface)',
                    }}>
                      {imgUrl ? (
                        <Image src={imgUrl} alt={pick.title} fill className="object-cover" sizes="64px" />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '1.5rem', opacity: 0.15 }}>🎬</div>
                      )}
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5 }}>
                      <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--cream)', margin: 0, lineHeight: 1.2 }}>
                        {pick.title}
                      </p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {pick.releaseYear && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>{pick.releaseYear}</span>
                        )}
                        {pick.runtime ? (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>
                            {Math.floor(pick.runtime / 60)}h {pick.runtime % 60}m
                          </span>
                        ) : (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>runtime unknown</span>
                        )}
                        {pick.imdbRating && (
                          <span style={{ background: '#D4960A', color: '#0A0800', fontWeight: 700, fontSize: 9, padding: '1px 4px', borderRadius: 1 }}>
                            ★ {pick.imdbRating}
                          </span>
                        )}
                      </div>
                      {pinned && (
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1,
                          color: 'var(--amber)', display: 'inline-block', marginTop: 2,
                        }}>◼ PINNED TO TOP OF QUEUE</span>
                      )}
                    </div>
                  </div>

                  {/* Matches */}
                  {candidates.length > 1 && (
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: 1, marginBottom: '0.75rem', textAlign: 'center' }}>
                      {candidates.length} TITLES FIT · PICK {pickIdx + 1} OF {candidates.length}
                    </p>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {candidates.length > 1 && (
                      <button onClick={handlePickAgain} style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 3,
                        color: 'var(--cream-dim)', cursor: 'pointer', fontFamily: 'var(--font-mono)',
                        fontSize: 11, letterSpacing: 1, padding: '0.75rem',
                      }}>
                        <RefreshCw size={12} /> PICK AGAIN
                      </button>
                    )}
                    <button onClick={pinned ? onClose : handleOnDeck} style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: pinned ? 'var(--amber)' : 'rgba(192,120,24,0.12)',
                      border: '1px solid var(--amber)', borderRadius: 3,
                      color: pinned ? 'var(--bg)' : 'var(--amber)',
                      cursor: 'pointer', fontFamily: 'var(--font-mono)',
                      fontSize: 11, letterSpacing: 1, padding: '0.75rem', fontWeight: 700,
                    }}>
                      {pinned ? '✓ LET\'S GO' : <><Pin size={12} /> ON DECK</>}
                    </button>
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
