'use client'
import { useState } from 'react'
import Image from 'next/image'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { YearData } from '@/lib/stats'

// The only genuinely interactive piece of the Stats page (expand/collapse)
// — split out so the rest of the page can be a plain server component.
export default function YearInReviewSection({ yearData }: { yearData: YearData }) {
  const [yearOpen, setYearOpen] = useState(false)

  if (yearData.movieCount + yearData.showCount === 0) return null

  return (
    <div style={{ marginBottom: '0.625rem' }}>
      <button
        onClick={() => setYearOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(192,120,24,0.08)', border: '1px solid rgba(192,120,24,0.35)',
          borderRadius: yearOpen ? '6px 6px 0 0' : 6, padding: '0.75rem 1rem',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', letterSpacing: 2 }}>
          ◼ {yearData.year} YEAR IN REVIEW
        </span>
        {yearOpen ? <ChevronUp size={14} color="var(--amber)" /> : <ChevronDown size={14} color="var(--amber)" />}
      </button>

      {yearOpen && (
        <div style={{
          background: 'var(--raised)', border: '1px solid rgba(192,120,24,0.35)',
          borderTop: 'none', borderRadius: '0 0 6px 6px',
          padding: 'clamp(0.875rem, 3vw, 1.25rem)',
        }}>
          {/* Top stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
            {[
              { v: yearData.movieCount + yearData.showCount, l: 'TITLES' },
              { v: yearData.totalHours,                      l: 'HOURS' },
              { v: yearData.avgRating?.toFixed(1) ?? '—',   l: 'AVG ★' },
            ].map(({ v, l }) => (
              <div key={l} style={{ textAlign: 'center', background: 'var(--surface)', borderRadius: 4, padding: '0.75rem 0.5rem' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'clamp(20px, 6vw, 30px)', color: 'var(--amber)', lineHeight: 1 }}>{v}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)', letterSpacing: 2, marginTop: 5 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Highlight grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {/* Best movie */}
            {yearData.bestMovie && (
              <div style={{ background: 'var(--surface)', borderRadius: 4, padding: '0.75rem', display: 'flex', gap: 8, alignItems: 'center' }}>
                {yearData.bestMovie.posterPath && (
                  <div style={{ width: 36, height: 54, flexShrink: 0, borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                    <Image src={`https://image.tmdb.org/t/p/w92${yearData.bestMovie.posterPath}`} alt={yearData.bestMovie.title} fill style={{ objectFit: 'cover' }} sizes="36px" />
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', letterSpacing: 1, marginBottom: 3 }}>BEST</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{yearData.bestMovie.title}</div>
                  <div style={{ color: 'var(--amber)', fontSize: 12, marginTop: 2 }}>{'★'.repeat(yearData.bestMovie.rating)}</div>
                </div>
              </div>
            )}

            {/* Worst movie */}
            {yearData.worstMovie && yearData.worstMovie.title !== yearData.bestMovie?.title && (
              <div style={{ background: 'var(--surface)', borderRadius: 4, padding: '0.75rem', display: 'flex', gap: 8, alignItems: 'center' }}>
                {yearData.worstMovie.posterPath && (
                  <div style={{ width: 36, height: 54, flexShrink: 0, borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                    <Image src={`https://image.tmdb.org/t/p/w92${yearData.worstMovie.posterPath}`} alt={yearData.worstMovie.title} fill style={{ objectFit: 'cover' }} sizes="36px" />
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)', letterSpacing: 1, marginBottom: 3 }}>SKIP IT</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{yearData.worstMovie.title}</div>
                  <div style={{ color: 'rgba(192,120,24,0.35)', fontSize: 12, marginTop: 2 }}>{'★'.repeat(yearData.worstMovie.rating)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom tags */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {yearData.topGenre && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 3, padding: '4px 8px', letterSpacing: 1 }}>
                TOP GENRE: <span style={{ color: 'var(--amber)' }}>{yearData.topGenre.toUpperCase()}</span>
              </span>
            )}
            {yearData.hottestMonth && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 3, padding: '4px 8px', letterSpacing: 1 }}>
                HOTTEST MONTH: <span style={{ color: 'var(--amber)' }}>{yearData.hottestMonth.toUpperCase()}</span>
              </span>
            )}
            {yearData.topTag && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 3, padding: '4px 8px', letterSpacing: 1 }}>
                LOVED: <span style={{ color: 'var(--amber)' }}>{yearData.topTag.toUpperCase()}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
