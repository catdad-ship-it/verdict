import { BarChart2 } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { computeStats, computeYearStats, computeTasteInsights } from '@/lib/stats'
import YearInReviewSection from '@/components/stats/YearInReviewSection'

const DECADE_LABEL = (decade: number) => `${decade}s`

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
// rows = weekdays.
function HeatmapCalendar({ days }: { days: { date: string; count: number }[] }) {
  const countByDate = new Map(days.map(d => [d.date, d.count]))

  // UTC throughout — the server buckets heatmapDays by UTC day, so
  // stepping/keying this grid in local time would shift every cell by a
  // day for anyone not at UTC+0 (worse, by a variable amount across DST).
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const TOTAL_DAYS = 371 // 53 weeks
  const start = new Date(today)
  start.setUTCDate(start.getUTCDate() - (TOTAL_DAYS - 1))
  start.setUTCDate(start.getUTCDate() - start.getUTCDay()) // back up to the preceding Sunday

  const cells: { date: string; count: number }[] = []
  const cursor = new Date(start)
  while (cursor <= today) {
    const iso = cursor.toISOString().slice(0, 10)
    cells.push({ date: iso, count: countByDate.get(iso) ?? 0 })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
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
          const prevMonth = wi > 0 ? new Date(weeks[wi - 1][0].date).getUTCMonth() : null
          const isNewMonth = prevMonth !== null && prevMonth !== firstDay.getUTCMonth()
          return (
            <div key={week[0].date} style={{ display: 'flex', flexDirection: 'column', gap: 3, position: 'relative' }}>
              {isNewMonth && (
                <span style={{
                  position: 'absolute', top: -14, left: 0, whiteSpace: 'nowrap',
                  fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)',
                }}>
                  {firstDay.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}
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

// Pure server-rendered read of GET data — no client fetch-after-hydrate
// waterfall, no client JS beyond the one interactive piece (Year in
// Review's expand/collapse, split out to YearInReviewSection). A thrown
// error here is caught by error.tsx (Next's error boundary), which
// renders the shared ErrorState with a real retry.
export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [stats, yearData, taste] = await Promise.all([
    computeStats(supabase, user.id),
    computeYearStats(supabase, user.id),
    computeTasteInsights(supabase, user.id),
  ])

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

      <YearInReviewSection yearData={yearData} />

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
            color: 'var(--cream-dim)', letterSpacing: 1, marginTop: 5,
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
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)' }}>
                {ratedCount} rated
              </div>
            </>
          ) : (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)', marginTop: 8 }}>
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
                    fontFamily: 'var(--font-mono)', fontSize: 11, width: 11, flexShrink: 0,
                    color: i === 0 ? 'var(--amber)' : 'var(--cream-dim)',
                  }}>{i + 1}</span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12, flex: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: i === 0 ? 'var(--cream)' : 'var(--cream-dim)',
                  }}>
                    {name}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)', flexShrink: 0 }}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)', marginTop: 8 }}>
              No data yet
            </div>
          )}
        </BentoCard>
      </div>

      {/* ── YOUR TASTE ── */}
      <BentoCard style={{ marginBottom: '0.625rem' }}>
        <CardLabel>Your Taste</CardLabel>
        {taste.topRatedGenres.length === 0 && taste.mostWatchedGenres.length === 0 ? (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)' }}>
            Rate a few more movies to unlock this.
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cream-dim)', letterSpacing: 1, marginBottom: 6 }}>RATED HIGHEST</div>
                {taste.topRatedGenres.length > 0 ? taste.topRatedGenres.map(g => (
                  <div key={g.genreId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--cream)', marginBottom: 4 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
                    <span style={{ color: 'var(--amber)', flexShrink: 0 }}>{g.avgRating.toFixed(1)}★</span>
                  </div>
                )) : (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)' }}>Not enough ratings yet</div>
                )}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cream-dim)', letterSpacing: 1, marginBottom: 6 }}>MOST WATCHED</div>
                {taste.mostWatchedGenres.map(g => (
                  <div key={g.genreId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--cream)', marginBottom: 4 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
                    <span style={{ color: 'var(--cream-dim)', flexShrink: 0 }}>{g.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {taste.decades.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cream-dim)', letterSpacing: 1, marginBottom: 6 }}>DECADES</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {taste.decades.map(d => (
                    <span key={d.decade} style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)',
                      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 3, padding: '3px 7px',
                    }}>
                      {DECADE_LABEL(d.decade)} · {d.count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(taste.preferredGenres.length > 0 || taste.excludedGenres.length > 0) && (
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cream-dim)', letterSpacing: 1, marginBottom: 6 }}>SUGGESTER IS TUNED FOR</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {taste.preferredGenres.map(name => (
                    <span key={name} style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)',
                      background: 'rgba(192,120,24,0.12)', border: '1px solid var(--amber)', borderRadius: 3, padding: '3px 7px',
                    }}>+ {name}</span>
                  ))}
                  {taste.excludedGenres.map(name => (
                    <span key={name} style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11, color: '#E08070',
                      background: 'rgba(154,48,40,0.15)', border: '1px solid #9A3028', borderRadius: 3, padding: '3px 7px',
                    }}>− {name}</span>
                  ))}
                </div>
              </div>
            )}

            <Link href="/settings#genre-tuning" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', letterSpacing: 1 }}>
              ADJUST IN SETTINGS →
            </Link>
          </>
        )}
      </BentoCard>

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
                    color: count > 0 ? 'var(--cream-dim)' : 'transparent',
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
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                    color: 'var(--amber)', marginTop: 5, letterSpacing: -0.5,
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
                    fontFamily: 'var(--font-mono)', fontSize: 11,
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
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)' }}>{label}</span>
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
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)' }}>LESS</span>
            {[0, 0.3, 0.55, 0.8, 1].map(ratio => (
              <div key={ratio} style={{
                width: 10, height: 10, borderRadius: 2,
                background: ratio === 0 ? 'rgba(255,255,255,0.05)' : `rgba(192,120,24,${(0.3 + ratio * 0.7).toFixed(2)})`,
              }} />
            ))}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cream-dim)' }}>MORE</span>
          </div>
        </BentoCard>
      )}

    </div>
  )
}
