'use client'
import { useState, useEffect } from 'react'
import { ChevronDown, Plus, Check, Tv } from 'lucide-react'
import Image from 'next/image'
import { posterUrl, relativeTime } from '@/lib/utils'

interface ActivityItem {
  id: string
  type: 'added' | 'watched_movie' | 'watched_show'
  title: string
  posterPath: string | null
  timestamp: string
  rating?: number | null
  status?: string
}

const STORAGE_KEY = 'verdict_activity_collapsed'

function describe(item: ActivityItem): string {
  if (item.type === 'added') return `Added ${item.title}`
  if (item.type === 'watched_movie') {
    return item.rating ? `Watched ${item.title} — ${'★'.repeat(item.rating)}` : `Watched ${item.title}`
  }
  return `Marked ${item.title} as ${item.status ?? 'watched'}`
}

function iconFor(item: ActivityItem) {
  if (item.type === 'added') return <Plus size={11} color="var(--amber)" />
  if (item.type === 'watched_show') return <Tv size={11} color="var(--amber)" />
  return <Check size={11} color="var(--amber)" />
}

// A slim, collapsible strip of the user's last few actions (queue adds +
// watched movies/shows merged and sorted by time) — gives Home a sense of
// momentum without needing to dig into Watched History.
export default function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setCollapsed(localStorage.getItem(STORAGE_KEY) === '1')
  }, [])

  useEffect(() => {
    fetch('/api/activity')
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  const toggle = () => {
    setCollapsed(c => {
      const next = !c
      if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }

  if (loaded && items.length === 0) return null

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <button
        onClick={toggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
          cursor: 'pointer', padding: '0.2rem 0', fontFamily: 'var(--font-mono)',
          fontSize: 11, letterSpacing: 1.5, color: 'var(--cream-dim)', textTransform: 'uppercase',
        }}
      >
        RECENT ACTIVITY
        <ChevronDown size={12} style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {!collapsed && (
        <div className="hscroll" style={{ overflowX: 'auto', marginTop: 6 }}>
          <div style={{ display: 'flex', gap: 8, minWidth: 'max-content' }}>
            {items.map(item => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 4, padding: '0.4rem 0.6rem 0.4rem 0.4rem',
              }}>
                <div style={{ width: 26, height: 39, flexShrink: 0, borderRadius: 2, overflow: 'hidden', position: 'relative', background: 'var(--bg)' }}>
                  {item.posterPath && <Image src={posterUrl(item.posterPath)!} alt={item.title} fill style={{ objectFit: 'cover' }} />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {iconFor(item)}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream)', whiteSpace: 'nowrap', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {describe(item)}
                    </span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)' }}>{relativeTime(item.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
