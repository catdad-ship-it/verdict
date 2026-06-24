'use client'
import { useState, useEffect, useCallback } from 'react'
import { X, Search, Plus, Tv } from 'lucide-react'
import { posterUrl } from '@/lib/utils'
import Image from 'next/image'

interface SearchResult {
  tmdbId: number
  title: string
  releaseYear?: string
  posterPath: string | null
  overview?: string
  runtime?: number
  genres?: number[]
  imdbRating?: number | null
  rtScore?: number | null
  mediaType?: 'movie' | 'show'
}

interface Props {
  onClose: () => void
  onAdd: (item: SearchResult & { mediaType: 'movie' | 'show' }) => Promise<void>
}

export default function SearchAddModal({ onClose, onAdd }: Props) {
  const [query, setQuery]     = useState('')
  const [tab, setTab]         = useState<'movie' | 'show'>('movie')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding]   = useState<number | null>(null)

  const search = useCallback(async (q: string, type: 'movie' | 'show') => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const endpoint = type === 'movie' ? `/api/movies/search?q=${encodeURIComponent(q)}` : `/api/shows/search?q=${encodeURIComponent(q)}`
      const res = await fetch(endpoint)
      const data = await res.json()
      setResults((data ?? []).slice(0, 8))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query, tab), 350)
    return () => clearTimeout(t)
  }, [query, tab, search])

  const handleAdd = async (item: SearchResult) => {
    setAdding(item.tmdbId)
    try {
      await onAdd({ ...item, mediaType: tab })
    } finally {
      setAdding(null)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'var(--surface)', border: '2px solid var(--amber)', borderRadius: 4, width: '100%', maxWidth: 560, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1rem', borderBottom: '1px solid var(--amber-dim)' }}>
          <Search size={16} color="var(--amber)" />
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 14, flex: 1 }}>SEARCH &amp; ADD TO QUEUE</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cream-dim)' }}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--amber-dim)' }}>
          {(['movie', 'show'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setResults([]) }}
              style={{
                flex: 1, padding: '0.6rem', background: tab === t ? 'var(--amber)' : 'transparent',
                color: tab === t ? 'var(--bg)' : 'var(--cream-dim)',
                border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {t === 'show' && <Tv size={12} />}
              {t === 'movie' ? '▶ MOVIES' : '📺 TV SHOWS'}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: '0.75rem 1rem' }}>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={tab === 'movie' ? 'Search movies...' : 'Search TV shows...'}
            style={{
              width: '100%', background: 'var(--bg)', border: '1px solid var(--amber-dim)',
              color: 'var(--cream)', padding: '0.5rem 0.75rem', borderRadius: 2,
              fontFamily: 'var(--font-mono)', fontSize: 13, outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Results */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              SEARCHING...
            </div>
          )}
          {!loading && results.map(item => (
            <div key={item.tmdbId} style={{
              display: 'flex', gap: 12, padding: '0.75rem 1rem',
              borderBottom: '1px solid rgba(192,120,24,0.1)',
              alignItems: 'center',
            }}>
              <div style={{ width: 40, height: 60, flexShrink: 0, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                {item.posterPath
                  ? <Image src={posterUrl(item.posterPath)!} alt={item.title} fill style={{ objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Tv size={16} color="var(--amber-dim)" /></div>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--cream)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                <div style={{ color: 'var(--cream-dim)', fontSize: 11, fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {item.releaseYear}
                  {item.imdbRating && <span style={{ marginLeft: 8, color: 'var(--amber)' }}>★ {item.imdbRating}</span>}
                </div>
              </div>
              <button
                onClick={() => handleAdd(item)}
                disabled={adding === item.tmdbId}
                className="vcr-btn"
                style={{ fontSize: 11, padding: '0.35rem 0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Plus size={12} />
                {adding === item.tmdbId ? '...' : 'ADD'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
