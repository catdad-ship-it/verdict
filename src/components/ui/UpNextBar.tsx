'use client'
import { useState, useEffect, useCallback } from 'react'
import { Clock } from 'lucide-react'
import Image from 'next/image'
import { posterUrl, formatRuntime } from '@/lib/utils'
import PostWatchModal from '@/components/modals/PostWatchModal'
import type { QueueItem, PostWatchAnswers } from '@/lib/types'

const PIN_KEY = 'verdict_pin_queue'

// Persistent "On Deck" strip, mounted once in the app layout so it's visible
// on every page — mirrors whatever's pinned in the queue on Home, so
// starting tonight's watch never requires navigating back to the queue
// first. Home dispatches a `verdict:pin-changed` window event whenever the
// pin (or the pinned item's watched/removed state) changes, since same-tab
// localStorage writes don't fire the native `storage` event.
export default function UpNextBar() {
  const [item, setItem] = useState<QueueItem | null>(null)
  const [postWatch, setPostWatch] = useState(false)

  const sync = useCallback(async () => {
    const pinnedKey = typeof window !== 'undefined' ? localStorage.getItem(PIN_KEY) : null
    if (!pinnedKey) { setItem(null); return }
    try {
      const queue: QueueItem[] = await fetch('/api/queue').then(r => r.json())
      const match = queue.find(q => `${q.tmdbId}-${q.mediaType}` === pinnedKey) ?? null
      setItem(match)
    } catch {
      setItem(null)
    }
  }, [])

  useEffect(() => {
    // sync() also runs on mount to establish initial state, not just as the
    // event listener callback — otherwise the bar would stay empty until
    // the first pin-changed/storage event fires.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    sync()
    window.addEventListener('verdict:pin-changed', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('verdict:pin-changed', sync)
      window.removeEventListener('storage', sync)
    }
  }, [sync])

  const handleSave = async (answers: PostWatchAnswers) => {
    if (!item) return
    await fetch('/api/watched', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type:  item.mediaType === 'tv' ? 'show' : 'movie',
        tmdb_id:     item.tmdbId,
        title:       item.title,
        poster_path: item.posterPath,
        genre_ids:   item.genreIds,
        runtime:     item.runtime,
        user_rating: answers.userRating,
        what_worked: answers.whatWorked,
        want_more:   answers.wantMoreLikeThis,
        notes:       answers.notes ?? null,
        status:      item.mediaType === 'tv' ? 'watching' : undefined,
      }),
    })
    localStorage.removeItem(PIN_KEY)
    setPostWatch(false)
    setItem(null)
  }

  if (!item) return null

  return (
    <>
      <div style={{
        position: 'fixed', left: 0, right: 0,
        bottom: 'calc(70px + env(safe-area-inset-bottom))',
        zIndex: 40, display: 'flex', justifyContent: 'center', pointerEvents: 'none',
        padding: '0 0.75rem',
      }}>
        <div style={{
          pointerEvents: 'auto',
          display: 'flex', alignItems: 'center', gap: 10, width: '100%', maxWidth: 640,
          background: 'var(--surface)', border: '1px solid var(--amber)',
          borderRadius: 6, padding: '0.5rem 0.75rem',
          boxShadow: '0 -6px 20px rgba(0,0,0,0.5)',
        }}>
          <div style={{ width: 30, height: 45, flexShrink: 0, borderRadius: 2, overflow: 'hidden', position: 'relative', background: 'var(--bg)' }}>
            {item.posterPath && <Image src={posterUrl(item.posterPath)!} alt={item.title} fill style={{ objectFit: 'cover' }} sizes="30px" />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', letterSpacing: 1.5 }}>ON DECK</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.title}
            </div>
            {item.runtime != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Clock size={9} color="var(--cream-dim)" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)' }}>{formatRuntime(item.runtime)}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setPostWatch(true)}
            className="vcr-btn-primary"
            style={{ fontSize: 10, padding: '0.5rem 0.75rem', flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            ✓ WATCHED
          </button>
        </div>
      </div>
      {postWatch && (
        <PostWatchModal
          title={item.title}
          mediaType={item.mediaType}
          runtime={item.runtime ?? undefined}
          onSave={handleSave}
          onClose={() => setPostWatch(false)}
        />
      )}
    </>
  )
}
