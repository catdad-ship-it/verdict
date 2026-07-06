import type { SupabaseClient } from '@supabase/supabase-js'
import { TMDB_GENRES } from '@/lib/types'

export interface StatsData {
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

export interface YearData {
  year: number
  movieCount: number
  showCount: number
  totalHours: number
  avgRating: number | null
  bestMovie: { title: string; posterPath: string | null; rating: number } | null
  worstMovie: { title: string; posterPath: string | null; rating: number } | null
  topGenre: string | null
  hottestMonth: string | null
  topTag: string | null
}

// Shared by /api/stats and the Stats page's server-side render — kept as
// one function so the two never drift on how a number is computed.
export async function computeStats(supabase: SupabaseClient, userId: string): Promise<StatsData> {
  const [{ data: movies }, { data: shows }] = await Promise.all([
    supabase.from('watched_movies')
      .select('genre_ids, user_rating, what_worked, runtime, watched_at')
      .eq('user_id', userId),
    supabase.from('watched_shows')
      .select('genre_ids, status, updated_at')
      .eq('user_id', userId),
  ])

  const m = movies ?? []
  const s = shows ?? []

  const movieCount = m.length
  const showCount = s.length
  const totalRuntimeMinutes = m.reduce((acc, mov) => acc + (mov.runtime ?? 0), 0)

  const ratedMovies = m.filter(mov => mov.user_rating != null)
  const avgRating = ratedMovies.length > 0
    ? ratedMovies.reduce((acc, mov) => acc + mov.user_rating!, 0) / ratedMovies.length
    : null

  const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const mov of ratedMovies) {
    ratingDist[mov.user_rating!] = (ratingDist[mov.user_rating!] ?? 0) + 1
  }
  const ratingDistribution = [1, 2, 3, 4, 5].map(r => ({ rating: r, count: ratingDist[r] ?? 0 }))

  const genreCounts: Record<number, number> = {}
  for (const mov of m) {
    for (const gId of mov.genre_ids ?? []) genreCounts[gId] = (genreCounts[gId] ?? 0) + 1
  }
  for (const show of s) {
    for (const gId of show.genre_ids ?? []) genreCounts[gId] = (genreCounts[gId] ?? 0) + 1
  }
  const topGenres = Object.entries(genreCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([id, count]) => ({
      genreId: parseInt(id),
      name: TMDB_GENRES[parseInt(id)] ?? 'Other',
      count,
    }))

  const tagCounts: Record<string, number> = {}
  for (const mov of m) {
    for (const tag of mov.what_worked ?? []) tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
  }
  const whatWorkedTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([tag, count]) => ({ tag, count }))

  // UTC throughout so bucketing doesn't depend on the server's local TZ.
  const now = new Date()
  const monthlyActivity = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (11 - i), 1))
    const year = d.getUTCFullYear()
    const month = d.getUTCMonth()
    const label = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
    const moviesWatched = m.filter(mov => {
      const w = new Date(mov.watched_at)
      return w.getUTCFullYear() === year && w.getUTCMonth() === month
    }).length
    const showsUpdated = s.filter(show => {
      const w = new Date(show.updated_at)
      return w.getUTCFullYear() === year && w.getUTCMonth() === month
    }).length
    return { month: label, movies: moviesWatched, shows: showsUpdated }
  })

  const dayCounts: Record<string, number> = {}
  for (const mov of m) {
    const day = new Date(mov.watched_at).toISOString().slice(0, 10)
    dayCounts[day] = (dayCounts[day] ?? 0) + 1
  }
  for (const show of s) {
    const day = new Date(show.updated_at).toISOString().slice(0, 10)
    dayCounts[day] = (dayCounts[day] ?? 0) + 1
  }
  const heatmapDays = Object.entries(dayCounts).map(([date, count]) => ({ date, count }))

  return {
    movieCount, showCount, totalRuntimeMinutes, avgRating,
    ratingDistribution, topGenres, whatWorkedTags, monthlyActivity, heatmapDays,
  }
}

export async function computeYearStats(supabase: SupabaseClient, userId: string): Promise<YearData> {
  const year = new Date().getFullYear()
  const start = `${year}-01-01`
  const end   = `${year + 1}-01-01`

  const [{ data: movies }, { data: shows }] = await Promise.all([
    supabase.from('watched_movies')
      .select('title, poster_path, user_rating, runtime, watched_at, genre_ids, what_worked')
      .eq('user_id', userId)
      .gte('watched_at', start)
      .lt('watched_at', end),
    supabase.from('watched_shows')
      .select('genre_ids, updated_at')
      .eq('user_id', userId)
      .gte('updated_at', start)
      .lt('updated_at', end),
  ])

  const m = movies ?? []
  const s = shows ?? []

  const totalHours = Math.round(m.reduce((a, x) => a + (x.runtime ?? 0), 0) / 60)
  const rated      = m.filter(x => x.user_rating != null)
  const avgRating  = rated.length > 0
    ? parseFloat((rated.reduce((a, x) => a + x.user_rating!, 0) / rated.length).toFixed(1))
    : null

  const sorted     = [...rated].sort((a, b) => b.user_rating! - a.user_rating!)
  const bestMovie  = sorted[0]  ? { title: sorted[0].title,  posterPath: sorted[0].poster_path,  rating: sorted[0].user_rating! }  : null
  const worstMovie = sorted.at(-1) && sorted.length > 1 ? { title: sorted.at(-1)!.title, posterPath: sorted.at(-1)!.poster_path, rating: sorted.at(-1)!.user_rating! } : null

  const genreCounts: Record<number, number> = {}
  for (const x of [...m, ...s]) {
    for (const g of x.genre_ids ?? []) genreCounts[g] = (genreCounts[g] ?? 0) + 1
  }
  const topGenreId = Object.entries(genreCounts).sort(([,a],[,b]) => b-a)[0]?.[0]
  const topGenre   = topGenreId ? (TMDB_GENRES[parseInt(topGenreId)] ?? null) : null

  const monthCounts: Record<string, number> = {}
  const monthFmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'long' })
  for (const x of m) monthCounts[monthFmt(x.watched_at)] = (monthCounts[monthFmt(x.watched_at)] ?? 0) + 1
  const hottestMonth = Object.entries(monthCounts).sort(([,a],[,b]) => b-a)[0]?.[0] ?? null

  const tagCounts: Record<string, number> = {}
  for (const x of m) for (const t of x.what_worked ?? []) tagCounts[t] = (tagCounts[t] ?? 0) + 1
  const topTag = Object.entries(tagCounts).sort(([,a],[,b]) => b-a)[0]?.[0] ?? null

  return {
    year, movieCount: m.length, showCount: s.length, totalHours, avgRating,
    bestMovie, worstMovie, topGenre, hottestMonth, topTag,
  }
}
