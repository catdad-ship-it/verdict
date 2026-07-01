import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { TMDB_GENRES } from '@/lib/types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: movies }, { data: shows }] = await Promise.all([
    supabase.from('watched_movies')
      .select('genre_ids, user_rating, what_worked, runtime, watched_at')
      .eq('user_id', user.id),
    supabase.from('watched_shows')
      .select('genre_ids, status, updated_at')
      .eq('user_id', user.id),
  ])

  const m = movies ?? []
  const s = shows ?? []

  // Counts
  const movieCount = m.length
  const showCount = s.length
  const totalRuntimeMinutes = m.reduce((acc, mov) => acc + (mov.runtime ?? 0), 0)

  // Average rating (movies only)
  const ratedMovies = m.filter(mov => mov.user_rating != null)
  const avgRating = ratedMovies.length > 0
    ? ratedMovies.reduce((acc, mov) => acc + mov.user_rating!, 0) / ratedMovies.length
    : null

  // Rating distribution
  const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const mov of ratedMovies) {
    ratingDist[mov.user_rating!] = (ratingDist[mov.user_rating!] ?? 0) + 1
  }
  const ratingDistribution = [1, 2, 3, 4, 5].map(r => ({ rating: r, count: ratingDist[r] ?? 0 }))

  // Genre counts — movies + shows combined
  const genreCounts: Record<number, number> = {}
  for (const mov of m) {
    for (const gId of mov.genre_ids ?? []) {
      genreCounts[gId] = (genreCounts[gId] ?? 0) + 1
    }
  }
  for (const show of s) {
    for (const gId of show.genre_ids ?? []) {
      genreCounts[gId] = (genreCounts[gId] ?? 0) + 1
    }
  }
  const topGenres = Object.entries(genreCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([id, count]) => ({
      genreId: parseInt(id),
      name: TMDB_GENRES[parseInt(id)] ?? 'Other',
      count,
    }))

  // What worked tags (movies only)
  const tagCounts: Record<string, number> = {}
  for (const mov of m) {
    for (const tag of mov.what_worked ?? []) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
    }
  }
  const whatWorkedTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([tag, count]) => ({ tag, count }))

  // Monthly activity — last 12 months
  const now = new Date()
  const monthlyActivity = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
    const year = d.getFullYear()
    const month = d.getMonth()
    const label = d.toLocaleDateString('en-US', { month: 'short' })
    const moviesWatched = m.filter(mov => {
      const w = new Date(mov.watched_at)
      return w.getFullYear() === year && w.getMonth() === month
    }).length
    const showsUpdated = s.filter(show => {
      const w = new Date(show.updated_at)
      return w.getFullYear() === year && w.getMonth() === month
    }).length
    return { month: label, movies: moviesWatched, shows: showsUpdated }
  })

  // Daily activity heatmap — sparse list of {date, count}; the client fills
  // in zero-count days itself so we don't ship ~370 mostly-empty rows.
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

  return NextResponse.json({
    movieCount,
    showCount,
    totalRuntimeMinutes,
    avgRating,
    ratingDistribution,
    topGenres,
    whatWorkedTags,
    monthlyActivity,
    heatmapDays,
  })
}
