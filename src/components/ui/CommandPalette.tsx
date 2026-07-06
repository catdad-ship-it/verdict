'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Dice3, Clock, Plus } from 'lucide-react'
import ModalShell from '@/components/ui/ModalShell'
import { useToast } from '@/components/ui/Toast'

interface SearchResult {
  tmdbId: number
  title: string
  releaseYear?: string
  posterPath: string | null
  mediaType: 'movie' | 'tv'
}

interface RawSearchItem {
  id: number
  title: string
  releaseYear?: string
  posterPath: string | null
}

const PAGES = [
  { href: '/',             label: 'GO TO LISTS' },
  { href: '/new-releases', label: 'GO TO NEW RELEASES' },
  { href: '/suggestions',  label: 'GO TO SUGGESTIONS' },
  { href: '/watched',      label: 'GO TO WATCHED' },
  { href: '/stats',        label: 'GO TO STATS' },
  { href: '/settings',     label: 'GO TO SETTINGS' },
]

// Global quick-add + quick-nav palette (⌘K / Ctrl+K) — promotes Home's
// existing "n" add-flow shortcut to something reachable from any page.
// Desktop-only in practice: no visible trigger button, just the shortcut,
// since there's no keyboard (or reason) to reach for this on mobile.
export default function CommandPalette() {
  const router = useRouter()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Tracks the latest `open` value for the keydown listener below, which is
  // attached once with an empty dep array — its closure would otherwise
  // always see the `open` from first render.
  const openRef = useRef(false)
  useEffect(() => { openRef.current = open })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        // Clear stale search state on the way in, not the way out — doing
        // it here (an event callback) rather than in an effect body avoids
        // synchronous setState-in-effect.
        if (!openRef.current) { setQuery(''); setResults([]) }
        setOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    // ModalShell already focuses the first focusable element on open —
    // this just makes sure it's specifically the search input, not the
    // first result/nav item, so typing works immediately.
    inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    abortRef.current?.abort()
    const trimmed = query.trim()
    const controller = new AbortController()
    abortRef.current = controller
    // All setState calls live inside this timeout callback (not the effect
    // body itself) so they run as a reaction to the debounce firing, not
    // synchronously during the effect.
    const t = setTimeout(async () => {
      if (!trimmed) { setResults([]); return }
      setSearching(true)
      try {
        const [movies, shows] = await Promise.all([
          fetch(`/api/movies/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal }).then(r => r.json()),
          fetch(`/api/shows/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal }).then(r => r.json()),
        ])
        const toResults = (items: RawSearchItem[], mediaType: 'movie' | 'tv'): SearchResult[] =>
          (Array.isArray(items) ? items : []).map(m => ({
            tmdbId: m.id, title: m.title, releaseYear: m.releaseYear, posterPath: m.posterPath, mediaType,
          }))
        setResults([...toResults(movies, 'movie'), ...toResults(shows, 'tv')].slice(0, 8))
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setResults([])
      } finally {
        if (abortRef.current === controller) setSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  const close = useCallback(() => { setOpen(false); setQuery(''); setResults([]) }, [])

  const goTo = (href: string) => {
    router.push(href)
    close()
  }

  const quickAction = (action: 'spin' | 'watch-tonight') => {
    // Spin/Watch Tonight need queue state that only lives on Home — jump
    // there and let it pick up the request instead of duplicating that
    // state at the layout level. router.push() doesn't block on the new
    // page mounting, so dispatching a window event right after it would
    // race Home's listener attaching — a `?quickAction=` param survives
    // the navigation instead, and Home reads it on mount.
    if (window.location.pathname !== '/') {
      router.push(`/?quickAction=${action}`)
    } else {
      window.dispatchEvent(new Event(`verdict:open-${action}`))
    }
    close()
  }

  const addToQueue = async (item: SearchResult) => {
    setAdding(item.tmdbId)
    try {
      await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdbId: item.tmdbId, title: item.title, posterPath: item.posterPath, mediaType: item.mediaType }),
      })
      toast.show(`ADDED "${item.title.toUpperCase()}" TO QUEUE`)
      window.dispatchEvent(new Event('verdict:queue-changed'))
    } finally {
      setAdding(null)
    }
  }

  const filteredPages = PAGES.filter(p => p.label.toLowerCase().includes(query.toLowerCase()))

  if (!open) return null

  return (
    <div
      className="fixed inset-0 flex items-start justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', paddingTop: '12vh', zIndex: 9000 }}
      onClick={e => e.target === e.currentTarget && close()}
    >
      <ModalShell
        onClose={close}
        label="Command palette"
        className="w-full mx-4 md:mx-0 md:max-w-lg rounded-sm overflow-hidden"
        style={{ background: 'var(--surface)', border: '2px solid var(--amber)', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.875rem 1rem', borderBottom: '1px solid var(--amber-dim)' }}>
          <Search size={15} color="var(--amber)" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="INSERT TAPE — search, jump, or act..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'var(--cream)', fontFamily: 'var(--font-mono)', fontSize: 16,
            }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cream-dim)', border: '1px solid var(--border)', borderRadius: 2, padding: '2px 5px' }}>ESC</span>
        </div>

        <div style={{ overflowY: 'auto' }}>
          {/* Quick actions — always visible, unfiltered */}
          {!query.trim() && (
            <div style={{ borderBottom: '1px solid var(--border)' }}>
              <button onClick={() => quickAction('spin')} style={paletteRowStyle}>
                <Dice3 size={14} color="var(--amber)" /> SPIN THE WHEEL
              </button>
              <button onClick={() => quickAction('watch-tonight')} style={paletteRowStyle}>
                <Clock size={14} color="var(--amber)" /> WATCH TONIGHT
              </button>
            </div>
          )}

          {/* Page nav */}
          {filteredPages.length > 0 && (
            <div style={{ borderBottom: '1px solid var(--border)' }}>
              {filteredPages.map(p => (
                <button key={p.href} onClick={() => goTo(p.href)} style={paletteRowStyle}>
                  → {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Search results */}
          {searching && (
            <div style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cream-dim)', textAlign: 'center' }}>SEARCHING...</div>
          )}
          {!searching && results.map(item => (
            <div key={`${item.mediaType}-${item.tmdbId}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.6rem 1rem', borderBottom: '1px solid rgba(192,120,24,0.1)' }}>
              <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.title}{item.releaseYear ? ` (${item.releaseYear})` : ''}
              </span>
              <button
                onClick={() => addToQueue(item)}
                disabled={adding === item.tmdbId}
                className="vcr-btn"
                style={{ fontSize: 11, padding: '0.35rem 0.6rem', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
              >
                <Plus size={12} /> {adding === item.tmdbId ? '...' : 'ADD'}
              </button>
            </div>
          ))}
          {query.trim() && !searching && results.length === 0 && filteredPages.length === 0 && (
            <div style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cream-dim)', textAlign: 'center' }}>NO RESULTS.</div>
          )}
        </div>
      </ModalShell>
    </div>
  )
}

const paletteRowStyle: React.CSSProperties = {
  width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
  padding: '0.7rem 1rem', background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--cream)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: 1,
}
