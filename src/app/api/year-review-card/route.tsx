import { createClient } from '@/lib/supabase/server'
import { computeYearStats } from '@/lib/stats'
import { ImageResponse } from 'next/og'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const BG = '#0D0B07'
const SURFACE = '#1A1712'
const RAISED = '#2C2820'
const AMBER = '#C07818'
const CREAM = '#E4CC90'
const CREAM_DIM = '#B8A068'

// GET /api/year-review-card — a 1080x1920 (story-format) share image of
// the signed-in user's Year in Review, generated on request via Next's
// built-in ImageResponse (satori under the hood — no @vercel/og
// dependency needed, it ships as next/og). No custom font loaded (satori
// needs an explicit font file for anything beyond its default sans) —
// scoped out to keep this shippable; the VHS monospace look is
// approximated with letter-spacing instead.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const year = await computeYearStats(supabase, user.id)
  const totalTitles = year.movieCount + year.showCount

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        background: BG, color: CREAM, padding: 72,
        fontFamily: 'sans-serif',
      }}>
        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: AMBER, padding: '14px 28px' }}>
            <span style={{ fontSize: 40, fontWeight: 900, color: BG, letterSpacing: 1 }}>VERDICT</span>
          </div>
        </div>

        {/* Year + headline */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* satori's default font has no glyph for ◼ — a plain div reads
                identically and can't render as a tofu box. */}
            <div style={{ display: 'flex', width: 20, height: 20, background: AMBER }} />
            <span style={{ fontSize: 32, color: AMBER, letterSpacing: 8 }}>{year.year} YEAR IN REVIEW</span>
          </div>
          <span style={{ display: 'flex', fontSize: 220, fontWeight: 900, color: AMBER, lineHeight: 1, marginTop: 24 }}>
            {totalTitles}
          </span>
          <span style={{ fontSize: 36, color: CREAM_DIM, letterSpacing: 4, marginTop: 8 }}>TITLES WATCHED</span>
        </div>

        {/* Stat grid */}
        <div style={{ display: 'flex', gap: 20, marginTop: 80 }}>
          {[
            { v: year.totalHours, l: 'HOURS' },
            { v: year.avgRating?.toFixed(1) ?? '—', l: 'AVG RATING' },
          ].map(({ v, l }) => (
            <div key={l} style={{
              display: 'flex', flexDirection: 'column', flex: 1, background: SURFACE,
              borderRadius: 12, padding: '32px 24px', alignItems: 'center',
            }}>
              <span style={{ fontSize: 72, fontWeight: 900, color: AMBER }}>{v}</span>
              <span style={{ fontSize: 24, color: CREAM_DIM, letterSpacing: 3, marginTop: 8 }}>{l}</span>
            </div>
          ))}
        </div>

        {/* Highlights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 40 }}>
          {[
            year.topGenre && { l: 'TOP GENRE', v: year.topGenre.toUpperCase() },
            year.hottestMonth && { l: 'HOTTEST MONTH', v: year.hottestMonth.toUpperCase() },
            year.topTag && { l: 'LOVED', v: year.topTag.toUpperCase() },
            year.bestMovie && { l: 'BEST WATCH', v: year.bestMovie.title.toUpperCase() },
          ].filter((x): x is { l: string; v: string } => Boolean(x)).map(({ l, v }) => (
            <div key={l} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: RAISED, borderRadius: 8, padding: '20px 28px',
            }}>
              <span style={{ fontSize: 24, color: CREAM_DIM, letterSpacing: 2 }}>{l}</span>
              <span style={{ fontSize: 28, color: AMBER, fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', marginTop: 'auto', justifyContent: 'center' }}>
          <span style={{ fontSize: 22, color: CREAM_DIM, letterSpacing: 3 }}>VERDICT-BNIEMAN.FLY.DEV</span>
        </div>
      </div>
    ),
    { width: 1080, height: 1920 }
  )
}
