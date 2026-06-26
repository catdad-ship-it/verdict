import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'

interface ListItem {
  id: string; tmdb_id: number; title: string; poster_path: string | null
  media_type: string; release_year: number | null; runtime: number | null
  imdb_rating: number | null; rt_score: number | null
}

function posterUrl(path: string | null) {
  if (!path) return null
  return `https://image.tmdb.org/t/p/w185${path}`
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const [{ data: list }, { data: items }] = await Promise.all([
    supabase.from('lists').select('id, name').eq('id', id).single(),
    supabase.from('list_items').select('*').eq('list_id', id).order('added_at', { ascending: false }),
  ])

  if (!list) notFound()

  const safeItems: ListItem[] = items ?? []

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg)',
      fontFamily: "'IBM Plex Mono', monospace",
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(192,120,24,0.25)',
        padding: '1.25rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
      }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 9, color: 'rgba(192,120,24,0.6)', letterSpacing: 3, margin: '0 0 4px' }}>VERDICT · SHARED LIST</p>
          <h1 style={{ fontSize: 'clamp(18px, 5vw, 26px)', color: 'var(--amber)', margin: 0, letterSpacing: 2, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {list.name.toUpperCase()}
          </h1>
          <p style={{ fontSize: 10, color: 'var(--muted)', margin: '4px 0 0', letterSpacing: 1 }}>
            {safeItems.length} {safeItems.length === 1 ? 'TITLE' : 'TITLES'}
          </p>
        </div>
        <a
          href="/"
          style={{
            fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0,
            fontSize: 10, color: 'var(--amber)', letterSpacing: 2,
            background: 'rgba(192,120,24,0.1)', border: '1px solid rgba(192,120,24,0.4)',
            borderRadius: 3, padding: '6px 12px', textDecoration: 'none', whiteSpace: 'nowrap',
          }}
        >
          GET VERDICT ↗
        </a>
      </div>

      {/* Items */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '1.25rem' }}>
        {safeItems.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--cream-dim)', fontSize: 13 }}>This list is empty.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {safeItems.map(item => {
              const img = posterUrl(item.poster_path)
              return (
                <div key={item.id} style={{
                  display: 'flex', gap: '0.875rem', padding: '0.75rem',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 4, alignItems: 'center',
                }}>
                  <div style={{
                    width: 48, height: 72, flexShrink: 0, borderRadius: 2,
                    overflow: 'hidden', position: 'relative', background: 'var(--raised)',
                  }}>
                    {img
                      ? <Image src={img} alt={item.title} fill style={{ objectFit: 'cover' }} sizes="48px" />
                      : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '1.25rem', opacity: 0.15 }}>🎬</div>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--cream)', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      {item.release_year && <span style={{ fontSize: 10, color: 'var(--muted)' }}>{item.release_year}</span>}
                      {item.runtime && <span style={{ fontSize: 10, color: 'var(--muted)' }}>{Math.floor(item.runtime / 60)}h {item.runtime % 60}m</span>}
                      {item.media_type === 'tv' && (
                        <span style={{ fontSize: 8, color: '#A8C898', background: 'rgba(34,80,34,0.4)', padding: '1px 5px', borderRadius: 2, letterSpacing: 1 }}>SHOW</span>
                      )}
                    </div>
                    {(item.imdb_rating || item.rt_score) && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
                        {item.imdb_rating && <span style={{ background: '#D4960A', color: '#0A0800', fontWeight: 700, fontSize: 9, padding: '1px 4px', borderRadius: 1 }}>★ {item.imdb_rating}</span>}
                        {item.rt_score && <span style={{ fontWeight: 700, fontSize: 10, color: '#D0603C' }}>🍅 {item.rt_score}%</span>}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
