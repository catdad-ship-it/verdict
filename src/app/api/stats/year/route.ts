import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { TMDB_GENRES } from '@/lib/types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const year = new Date().getFullYear()
  const start = `${year}-01-01`
  const end   = `${year}-12-31`

  const [{ data: movies }, { data: shows }] = await Promise.all([
    supabase.from('watched_movies')
      .select('title, poster_path, user_rating, runtime, watched_at, genre_ids, what_worked')
      .eq('user_id', user.id)
      .gte('watched_at', start)
      .lte('watched_at', end),
    supabase.from('watched_shows')
      .select('genre_ids, updated_at')
      .eq('user_id', user.id)
      .gte('updated_at', start)
      .lte('updated_at', end),
  ])

  const m = movies ?? []
  const s = shows ?? []

  const totalHours = Math.round(m.reduce((a, x) => a + (x.runtime ?? 0), 0) / 60)
  const rated      = m.filter(x => x.user_rating != null)
  const avgRating  = rated.length > 0
    ? parseFloat((rated.reduce((a, x) => a + x.user_rating!, 0) / rated.length).toFixed(1))
    : null

  // Best + worst rated
  const sorted     = [...rated].sort((a, b) => b.user_rating! - a.user_rating!)
  const bestMovie  = sorted[0]  ? { title: sorted[0].title,  posterPath: sorted[0].poster_path,  rating: sorted[0].user_rating! }  : null
  const worstMovie = sorted.at(-1) && sorted.length > 1 ? { title: sorted.at(-1)!.title, posterPath: sorted.at(-1)!.poster_path, rating: sorted.at(-1)!.user_rating! } : null

  // Top genre
  const genreCounts: Record<number, number> = {}
  for (const x of [...m, ...s]) {
    for (const g of x.genre_ids ?? []) genreCounts[g] = (genreCounts[g] ?? 0) + 1
  }
  const topGenreId = Object.entries(genreCounts).sort(([,a],[,b]) => b-a)[0]?.[0]
  const topGenre   = topGenreId ? (TMDB_GENRES[parseInt(topGenreId)] ?? null) : null

  // Hottest month
  const monthCounts: Record<string, number> = {}
  const monthFmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'long' })
  for (const x of m) monthCounts[monthFmt(x.watched_at)] = (monthCounts[monthFmt(x.watched_at)] ?? 0) + 1
  const hottestMonth = Object.entries(monthCounts).sort(([,a],[,b]) => b-a)[0]?.[0] ?? null

  // Top tag
  const tagCounts: Record<string, number> = {}
  for (const x of m) for (const t of x.what_worked ?? []) tagCounts[t] = (tagCounts[t] ?? 0) + 1
  const topTag = Object.entries(tagCounts).sort(([,a],[,b]) => b-a)[0]?.[0] ?? null

  return NextResponse.json({
    year,
    movieCount: m.length,
    showCount:  s.length,
    totalHours,
    avgRating,
    bestMovie,
    worstMovie,
    topGenre,
    hottestMonth,
    topTag,
  })
}
