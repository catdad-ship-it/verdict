'use client'
import { useState, useEffect } from 'react'
import { BarChart2 } from 'lucide-react'

interface StatsData {
  movieCount: number
  showCount: number
  totalRuntimeMinutes: number
  avgRating: number | null
  ratingDistribution: { rating: number; count: number }[]
  topGenres: { genreId: number; name: string; count: number }[]
  whatWorkedTags: { tag: string; count: number }[]
  monthlyActivity: { month: string; movies: number; shows: number }[]
}

const RATING_LABELS: Record<number, string> = {
  1: 'Skip It', 2: 'Meh', 3: 'Decent', 4: 'Liked It', 5: 'Masterpiece',
}

function StatBox({ value, label }: { value: string | number; label: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 'clamp(0.5rem, 2vw, 1rem)', background: 'var(--raised)', borderRadius: 4 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(20px, 6vw, 36px)', fontWeight: 700, color: 'var(--amber)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cream-dim)', letterSpacing: 2, marginTop: 6 }}>
        {label}
      </div>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '1.5rem' }}>
      <h2 style={{
        fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 11,
        letterSpacing: 3, margin: '0 0 0.75rem 0', textTransform: 'uppercase',
      }}>
        {title}
      </h2>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--amber-dim)',
        borderRadius: 4, padding: '1.25rem',
      }}>
        {children}
      </div>
    </section>
  )
}

function HBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(60px, 100px) 1fr 28px', alignItems: 'center', gap: '0.75rem' }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cream-dim)',
        textAlign: 'right', letterSpacing: 0.5, whiteSpace: 'nowrap', overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {label}
      </span>
      <div style={{ background: 'var(--raised)', borderRadius: 2, height: 14, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: max > 0 ? `${(count / max) * 100}%` : '0%',
          background: color,
          minWidth: count > 0 ? 4 : 0,
          transition: 'width 0.6s ease',
        }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)' }}>
        {count}
      </span>
    </div>
  )
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 13 }}>
        LOADING...
      </div>
    )
  }

  if (!stats) return null

  const totalHours = Math.round(stats.totalRuntimeMinutes / 60)
  const maxRating  = Math.max(...stats.ratingDistribution.map(r => r.count), 1)
  const maxGenre   = Math.max(...stats.topGenres.map(g => g.count), 1)
  const maxTag     = Math.max(...stats.whatWorkedTags.map(t => t.count), 1)
  const maxMonthly = Math.max(...stats.monthlyActivity.map(m => m.movies + m.shows), 1)
  const ratedCount = stats.ratingDistribution.reduce((a, b) => a + b.count, 0)

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '1.5rem 0' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem' }}>
        <BarChart2 size={18} color="var(--amber)" />
        <h1 style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 20, margin: 0, letterSpacing: 2 }}>
          YOUR STATS
        </h1>
      </div>

      {/* By the numbers */}
      <SectionCard title="By the Numbers">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          <StatBox value={stats.movieCount} label="MOVIES" />
          <StatBox value={stats.showCount} label="SHOWS" />
          <StatBox value={totalHours} label="HRS WATCHED" />
        </div>
      </SectionCard>

      {/* Average rating */}
      {stats.avgRating != null && (
        <SectionCard title="Average Rating">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 52, fontWeight: 700, color: 'var(--amber)', lineHeight: 1 }}>
              {stats.avgRating.toFixed(1)}
            </span>
            <div>
              <div style={{ color: 'var(--amber)', fontSize: 22, letterSpacing: 3 }}>
                {'★'.repeat(Math.round(stats.avgRating))}{'☆'.repeat(5 - Math.round(stats.avgRating))}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cream-dim)', marginTop: 4 }}>
                from {ratedCount} rated {ratedCount === 1 ? 'movie' : 'movies'}
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Rating breakdown */}
      {ratedCount > 0 && (
        <SectionCard title="Rating Breakdown">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[...stats.ratingDistribution].reverse().map(({ rating, count }) => (
              <HBar
                key={rating}
                label={`${'★'.repeat(rating)} ${RATING_LABELS[rating]}`}
                count={count}
                max={maxRating}
                color="var(--amber)"
              />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Top genres */}
      {stats.topGenres.length > 0 && (
        <SectionCard title="Top Genres">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {stats.topGenres.map(({ name, count }) => (
              <HBar
                key={name}
                label={name.toUpperCase()}
                count={count}
                max={maxGenre}
                color="linear-gradient(90deg, var(--amber), #B8860B)"
              />
            ))}
          </div>
        </SectionCard>
      )}

      {/* What worked */}
      {stats.whatWorkedTags.length > 0 && (
        <SectionCard title="What Worked">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {stats.whatWorkedTags.map(({ tag, count }) => (
              <HBar
                key={tag}
                label={tag.toUpperCase()}
                count={count}
                max={maxTag}
                color="rgba(192,120,24,0.55)"
              />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Activity by month */}
      <SectionCard title="Activity by Month">
        <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 110 }}>
          {stats.monthlyActivity.map(({ month, movies, shows }) => {
            const total   = movies + shows
            const barH    = maxMonthly > 0 ? Math.round((total / maxMonthly) * 88) : 0
            const movH    = maxMonthly > 0 ? Math.round((movies / maxMonthly) * 88) : 0
            const showH   = barH - movH
            return (
              <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Bar */}
                <div style={{ width: '100%', height: 88, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  {total > 0 && (
                    <div style={{ width: '100%', borderRadius: '2px 2px 0 0', overflow: 'hidden' }}>
                      {showH > 0 && (
                        <div style={{ height: showH, background: 'rgba(192,120,24,0.35)' }} />
                      )}
                      {movH > 0 && (
                        <div style={{ height: movH, background: 'var(--amber)' }} />
                      )}
                    </div>
                  )}
                  {total === 0 && (
                    <div style={{ height: 2, background: 'var(--raised)', borderRadius: 1 }} />
                  )}
                </div>
                {/* Label */}
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--cream-dim)',
                  marginTop: 5, letterSpacing: 0,
                }}>
                  {month.toUpperCase()}
                </span>
              </div>
            )
          })}
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: 16, justifyContent: 'center' }}>
          {[
            { color: 'var(--amber)', label: 'MOVIES' },
            { color: 'rgba(192,120,24,0.35)', label: 'SHOWS' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, background: color, borderRadius: 1 }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--cream-dim)' }}>{label}</span>
            </div>
          ))}
        </div>
      </SectionCard>

    </div>
  )
}
