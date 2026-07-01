'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { BarChart2, ChevronDown, ChevronUp } from 'lucide-react'

interface StatsData {
  movieCount: number
  showCount: number
  totalRuntimeMinutes: number
  avgRating: number | null
  ratingDistribution: { rating: number; count: number }[]
  topGenres: { genreId: number; name: string; count: number }[]
  whatWorkedTags: { tag: string; count: number }[]
  monthlyActivity: { month: string; movies: number; shows: number }[]
  heatmapDays: { date: string; count: number }[]
}
interface YearData {
  year: number
  movieCount: number
  showCount: number
  totalHours: number
  avgRating: number | null
  bestMovie:  { title: string; posterPath: string | null; rating: number } | null
  worstMovie: { title: string; posterPath: string | null; rating: number } | null
  topGenre:     string | null
  hottestMonth: string | null
  topTag:       string | null
}



function BentoCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--raised)', borderRadius: 6,
      padding: 'clamp(0.875rem, 3vw, 1.25rem)',
      ...style,
    }}>
      {children}
    </div>
  )
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 11,
      color: 'rgba(192,120,24,0.5)', letterSpacing: 2,
      marginBottom: '0.75rem', textTransform: 'uppercase',
    }}>
      {children}
    </div>
  )
}

// GitHub-style contribution grid — 53 weeks ending today, columns = weeks,
// rows = weekdays. Defined at module scope (not inside StatsPage) so it
// doesn't get recreated as a new component type on every render.
function HeatmapCalendar({ days }: { days: { date: string; count: number }[] }) {
  const countByDate = new Map(days.map(d => [d.date, d.count]))

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const TOTAL_DAYS = 371 // 53 weeks
  const start = new Date(today)
  start.setDate(start.getDate() - (TOTAL_DAYS - 1))
  start.setDate(start.getDate() - start.getDay()) // back up to the preceding Sunday

  const cells: { date: string; count: number }[] = []
  const cursor = new Date(start)
  while (cursor <= today) {
    const iso = cursor.toISOString().slice(0, 10)
    cells.push({ date: iso, count: countByDate.get(iso) ?? 0 })
    cursor.setDate(cursor.getDate() + 1)
  }

  const weeks: { date: string; count: number }[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const maxCount = Math.max(...cells.map(c => c.count), 1)
  const colorFor = (count: number) => {
    if (count === 0) return 'rgba(255,255,255,0.05)'
    const ratio = Math.min(count / maxCount, 1)
    return `rgba(192,120,24,${(0.3 + ratio * 0.7).toFixed(2)})`
  }

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
      <div style={{ display: 'flex', gap: 3, paddingTop: 14, width: 'max-content' }}>
        {weeks.map((week, wi) => {
          const firstDay = new Date(week[0].date)
          const prevMonth = wi > 0 ? new Date(weeks[wi - 1][0].date).getMonth() : null
          const isNewMonth = prevMonth !== null && prevMonth !== firstDay.getMonth()
          return (
            <div key={week[0].date} style={{ display: 'flex', flexDirection: 'column', gap: 3, position: 'relative' }}>
              {isNewMonth && (
                <span style={{
                  position: 'absolute', top: -14, left: 0, whiteSpace: 'nowrap',
                  fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--muted)',
                }}>
                  {firstDay.toLocaleDateString('en-US', { month: 'short' })}
                </span>
              )}
              {week.map(day => (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.count} watched`}
                  style={{ width: 10, height: 10, borderRadius: 2, background: colorFor(day.count) }}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function StatsPage() {
  const [stats, setStats]       = useState<StatsData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [yearData, setYearData] = useState<YearData | null>(null)
  const [yearOpen, setYearOpen] = useState(false)

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats).finally(() => setLoading(false))
    fetch('/api/stats/year').then(r => r.json()).then(setYearData).catch(() => {})
  }, [])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-mono)', color: 'var(--amber)', fontSize: 13 }}>
        LOADING...
      </div>
    )
  }

  if (!stats) return null

  const totalHours  = Math.round(stats.totalRuntimeMinutes / 60)
  const ratedCount  = stats.ratingDistribution.reduce((a, b) => a + b.count, 0)
  const maxRating   = Math.max(...stats.ratingDistribution.map(r => r.count), 1)
  const maxMonthly  = Math.max(...stats.monthlyActivity.map(m => m.movies + m.shows), 1)
  const maxTag      = Math.max(...stats.whatWorkedTags.map(t => t.count), 1)
  const sortedTags  = [...stats.whatWorkedTags].sort((a, b) => b.count - a.count)
  const totalTitles = stats.movieCount + stats.showCount

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '1.5rem 0' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
        <BarChart2 size={15} color="var(--amber)" />
        <h1 style={{
          fontFamily: 'var(--font-mono)', color: 'var(--amber)',
          fontSize: 12, margin: 0, letterSpacing: 3,
        }}>
          YOUR STATS
        </h1>
      </div>


      {/* ── YEAR IN REVIEW ── */}
      {yearData && (yearData.movieCount + yearData.showCount) > 0 && (
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
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: 2, marginTop: 5 }}>{l}</div>
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
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: 1, marginBottom: 3 }}>SKIP IT</div>
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
      )}

      {/* ── HERO ── */}
      <BentoCard style={{ marginBottom: '0.625rem', position: 'relative', overflow: 'hidden' }}>
        {/* Scanline texture */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.05) 3px, rgba(0,0,0,0.05) 4px)',
        }} />
        <div style={{ position: 'relative' }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontWeight: 700, lineHeight: 0.85,
            fontSize: 'clamp(64px, 18vw, 112px)', color: 'var(--amber)',
            textShadow: '0 0 60px rgba(192,120,24,0.25)',
          }}>
            {totalTitles}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 12,
            color: 'var(--cream-dim)', letterSpacing: 2, marginTop: 10,
          }}>
            TITLES WATCHED
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 13,
            color: 'var(--muted)', letterSpacing: 1, marginTop: 5,
          }}>
            {stats.movieCount} movies · {stats.showCount} shows · {totalHours} hrs
          </div>
        </div>
      </BentoCard>

      {/* ── 2-COL: avg rating + top genres ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '0.625rem', marginBottom: '0.625rem',
      }}>

        {/* Avg rating */}
        <BentoCard>
          <CardLabel>Avg Rating</CardLabel>
          {stats.avgRating != null ? (
            <>
              <div style={{
                fontFamily: 'var(--font-mono)', fontWeight: 700,
                fontSize: 'clamp(32px, 9vw, 48px)', color: 'var(--amber)', lineHeight: 1,
                marginBottom: 8,
              }}>
                {stats.avgRating.toFixed(1)}
              </div>
              <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
                {[1,2,3,4,5].map(n => (
                  <span key={n} style={{
                    fontSize: 13,
                    color: n <= Math.round(stats.avgRating!) ? 'var(--amber)' : 'rgba(192,120,24,0.2)',
                  }}>★</span>
                ))}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
                {ratedCount} rated
              </div>
            </>
          ) : (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
              No ratings yet
            </div>
          )}
        </BentoCard>

        {/* Top genres */}
        <BentoCard>
          <CardLabel>Top Genres</CardLabel>
          {stats.topGenres.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {stats.topGenres.slice(0, 5).map(({ name, count }, i) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10, width: 10, flexShrink: 0,
                    color: i === 0 ? 'var(--amber)' : 'var(--muted)',
                  }}>{i + 1}</span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12, flex: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: i === 0 ? 'var(--cream)' : 'var(--cream-dim)',
                  }}>
                    {name}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
              No data yet
            </div>
          )}
        </BentoCard>
      </div>

      {/* ── WHAT WORKED — tag cloud ── */}
      {sortedTags.length > 0 && (
        <BentoCard style={{ marginBottom: '0.625rem' }}>
          <CardLabel>What Worked</CardLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {sortedTags.map(({ tag, count }) => {
              const ratio   = count / maxTag
              const opacity = 0.3 + ratio * 0.7
              const fs      = Math.round(11 + ratio * 5)
              return (
                <span key={tag} style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: fs,
                  letterSpacing: 0.5,
                  color: `rgba(192,120,24,${opacity.toFixed(2)})`,
                  border: `1px solid rgba(192,120,24,${(opacity * 0.45).toFixed(2)})`,
                  background: `rgba(192,120,24,${(opacity * 0.07).toFixed(2)})`,
                  padding: '5px 10px',
                  borderRadius: 3,
                  whiteSpace: 'nowrap',
                }}>
                  {tag}
                </span>
              )
            })}
          </div>
        </BentoCard>
      )}

      {/* ── RATING BREAKDOWN — vertical bars ── */}
      {ratedCount > 0 && (
        <BentoCard style={{ marginBottom: '0.625rem' }}>
          <CardLabel>Rating Breakdown</CardLabel>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            {[1, 2, 3, 4, 5].map(star => {
              const found = stats.ratingDistribution.find(r => r.rating === star)
              const count = found?.count ?? 0
              const barH  = maxRating > 0 ? Math.round((count / maxRating) * 72) : 0
              const barColor =
                star >= 4 ? 'var(--amber)' :
                star === 3 ? 'rgba(192,120,24,0.55)' :
                             'rgba(192,120,24,0.28)'
              return (
                <div key={star} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* Count — always reserves height for alignment */}
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                    color: count > 0 ? 'var(--muted)' : 'transparent',
                    height: 16, display: 'flex', alignItems: 'flex-end', marginBottom: 3,
                  }}>
                    {count}
                  </div>
                  {/* Bar */}
                  <div style={{ width: '100%', height: 72, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <div style={{
                      width: '100%',
                      height: Math.max(barH, count > 0 ? 3 : 0),
                      background: barColor,
                      borderRadius: '2px 2px 0 0',
                    }} />
                  </div>
                  {/* Star label */}
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--amber)', marginTop: 5, letterSpacing: -0.5,
                    opacity: count > 0 ? 1 : 0.25,
                  }}>
                    {'★'.repeat(star)}
                  </div>
                </div>
              )
            })}
          </div>
        </BentoCard>
      )}

      {/* ── ACTIVITY BY MONTH ── */}
      {stats.monthlyActivity.length > 0 && (
        <BentoCard>
          <CardLabel>Activity by Month</CardLabel>
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 80 }}>
            {stats.monthlyActivity.map(({ month, movies, shows }) => {
              const total = movies + shows
              const barH  = maxMonthly > 0 ? Math.round((total / maxMonthly) * 62) : 0
              const movH  = total > 0 ? Math.round((movies / total) * barH) : 0
              const showH = barH - movH
              return (
                <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '100%', height: 62, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    {total > 0 ? (
                      <div style={{ width: '100%', borderRadius: '2px 2px 0 0', overflow: 'hidden' }}>
                        {showH > 0 && <div style={{ height: showH, background: 'rgba(192,120,24,0.35)' }} />}
                        {movH  > 0 && <div style={{ height: movH,  background: 'var(--amber)' }} />}
                      </div>
                    ) : (
                      <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 1 }} />
                    )}
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--cream-dim)', marginTop: 5,
                  }}>
                    {month.slice(0, 3).toUpperCase()}
                  </span>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 12, justifyContent: 'center' }}>
            {[
              { color: 'var(--amber)',          label: 'MOVIES' },
              { color: 'rgba(192,120,24,0.35)', label: 'SHOWS' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, background: color, borderRadius: 1 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </BentoCard>
      )}

      {/* ── WATCH HISTORY HEATMAP ── */}
      {stats.heatmapDays.length > 0 && (
        <BentoCard style={{ marginTop: '0.625rem' }}>
          <CardLabel>Watch History</CardLabel>
          <HeatmapCalendar days={stats.heatmapDays} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)' }}>LESS</span>
            {[0, 0.3, 0.55, 0.8, 1].map(ratio => (
              <div key={ratio} style={{
                width: 10, height: 10, borderRadius: 2,
                background: ratio === 0 ? 'rgba(255,255,255,0.05)' : `rgba(192,120,24,${(0.3 + ratio * 0.7).toFixed(2)})`,
              }} />
            ))}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)' }}>MORE</span>
          </div>
        </BentoCard>
      )}

    </div>
  )
}
