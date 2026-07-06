'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { extractShareQuery } from '@/lib/shareTarget'

interface SearchResult {
  tmdbId: number
  title: string
  releaseYear?: string
  posterPath: string | null
  mediaType: 'movie' | 'tv'
}

interface RawSearchItem { id: number; title: string; releaseYear?: string; posterPath: string | null }

// Landing page for Android's share sheet ("share -> Verdict" from
// YouTube/IMDb/Letterboxd). The share target only hands us free-text
// title/text/url — not a TMDB id — so this runs one search up front and
// lets the user confirm which result is the actual match before adding.
function ShareTargetContent() {
  const params = useSearchParams()
  const router = useRouter()
  const toast = useToast()
  const initialQuery = extractShareQuery({
    title: params.get('title') ?? undefined,
    text: params.get('text') ?? undefined,
    url: params.get('url') ?? undefined,
  })
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [adding, setAdding] = useState<number | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    const controller = new AbortController()
    const t = setTimeout(async () => {
      if (!trimmed) { setResults([]); setSearched(false); return }
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
        setResults([...toResults(movies, 'movie'), ...toResults(shows, 'tv')].slice(0, 10))
        setSearched(true)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') { setResults([]); setSearched(true) }
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => { clearTimeout(t); controller.abort() }
  }, [query])

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
      router.push('/')
    } finally {
      setAdding(null)
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--amber)', letterSpacing: 2, marginBottom: '1rem' }}>
        ADD TO QUEUE
      </h1>
      <input
        autoFocus
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search movies & shows..."
        style={{
          width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4,
          padding: '0.75rem 1rem', color: 'var(--cream)', fontFamily: 'var(--font-mono)', fontSize: 16, marginBottom: '1rem',
        }}
      />
      {searching && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cream-dim)', textAlign: 'center', padding: '1rem' }}>SEARCHING...</div>
      )}
      {!searching && searched && results.length === 0 && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cream-dim)', textAlign: 'center', padding: '1rem' }}>NO RESULTS. TRY A DIFFERENT SEARCH.</div>
      )}
      {!searching && results.map(item => (
        <div key={`${item.mediaType}-${item.tmdbId}`} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '0.6rem 0',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ flex: 1, fontSize: 14, color: 'var(--cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.title}{item.releaseYear ? ` (${item.releaseYear})` : ''}
          </span>
          <button
            onClick={() => addToQueue(item)}
            disabled={adding === item.tmdbId}
            className="vcr-btn-primary"
            style={{ fontSize: 12, padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
          >
            <Plus size={13} /> {adding === item.tmdbId ? '...' : 'ADD'}
          </button>
        </div>
      ))}
    </div>
  )
}

export default function ShareTargetPage() {
  return (
    <Suspense fallback={null}>
      <ShareTargetContent />
    </Suspense>
  )
}
