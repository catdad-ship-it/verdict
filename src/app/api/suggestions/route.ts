import { createClient } from '@/lib/supabase/server'
import { getMovieSuggestions, deriveGenrePreferences, getCastCrewCandidates, SEED_PROFILE } from '@/lib/suggestions'
import { getRatings } from '@/lib/omdb'
import { TMDB_GENRES } from '@/lib/types'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Extra IDs to exclude (already shown movies)
  const extraExclude = (req.nextUrl.searchParams.get('excludeIds') ?? '')
    .split(',').filter(Boolean).slice(0, 200).map(Number)

  const [
    { data: watched },
    { data: queue },
    { data: watchedShows },
    { data: tasteProfile },
  ] = await Promise.all([
    supabase.from('watched_movies').select('tmdb_id, genre_ids, user_rating, want_more_like_this, what_worked').eq('user_id', user.id),
    supabase.from('queue_items').select('tmdb_id, genre_ids').eq('user_id', user.id),
    supabase.from('watched_shows').select('tmdb_id, genre_ids').eq('user_id', user.id),
    supabase.from('taste_profiles').select('disliked_tmdb_ids, dismissed_genre_ids, preferred_genre_ids, excluded_genre_ids').eq('id', user.id).maybeSingle(),
  ])

  const watchedIds   = watched?.map(w => w.tmdb_id) ?? []
  const queueIds     = queue?.map(q => q.tmdb_id) ?? []
  const dismissedIds      = tasteProfile?.disliked_tmdb_ids ?? []
  const dismissedGenreIds = tasteProfile?.dismissed_genre_ids ?? []
  // Explicit "more/less of this genre" picks from Settings — separate from
  // the auto-derived signal above, and takes priority over it.
  const preferredGenreIds = tasteProfile?.preferred_genre_ids ?? []
  const excludedGenreIds  = tasteProfile?.excluded_genre_ids ?? []

  // Top-rated movies (4-5 stars) where user wants more like it — used for TMDB recs
  const topRatedMovieIds = (watched ?? [])
    .filter(w => w.user_rating != null && w.user_rating >= 4 && w.want_more_like_this !== false)
    .map(w => w.tmdb_id)

  const derivedScores = deriveGenrePreferences(
    (watched ?? []).map(w => ({
      genreIds: w.genre_ids ?? [],
      userRating: w.user_rating,
      wantMoreLikeThis: w.want_more_like_this,
      whatWorked: w.what_worked ?? [],
    })),
    (queue ?? []).map(q => ({ genreIds: q.genre_ids ?? [] })),
    (watchedShows ?? []).map(s => ({ genreIds: s.genre_ids ?? [] })),
    dismissedGenreIds,
  )

  // Fall back to seed profile if no history, converting ordered IDs to decreasing scores
  const genreScores = Object.keys(derivedScores).length > 0
    ? derivedScores
    : Object.fromEntries(SEED_PROFILE.topGenreIds.map((id, i) => [id, SEED_PROFILE.topGenreIds.length - i]))

  // Explicit genre picks from Settings override the auto-derived signal —
  // a strong flat boost so a genre you've never watched still shows up.
  for (const gId of preferredGenreIds) genreScores[gId] = (genreScores[gId] ?? 0) + 3

  // Top genre names for dynamic subtitle (top 4 positive genres)
  const topGenreNames = Object.entries(genreScores)
    .filter(([, s]) => s > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([id]) => TMDB_GENRES[parseInt(id)])
    .filter(Boolean)

  const excludeIdSet = new Set([...watchedIds, ...queueIds, ...dismissedIds, ...extraExclude])
  // Kicked off (not awaited) so it runs concurrently with the
  // discover/recommendations fan-out inside getMovieSuggestions instead of
  // fully completing before that work even starts.
  const castCrewCandidatesPromise = getCastCrewCandidates(topRatedMovieIds, excludeIdSet)

  const movies = await getMovieSuggestions({
    genreScores,
    watchedIds,
    queueIds,
    dismissedIds: [...dismissedIds, ...extraExclude],
    topRatedMovieIds,
    excludeGenreIds: excludedGenreIds,
    castCrewCandidatesPromise,
  })

  const withRatings = await Promise.all(
    movies.slice(0, 24).map(async m => {
      const r = await getRatings(m.title, m.releaseYear)
      return { ...m, imdbRating: r.imdbRating ?? m.imdbRating, rtScore: r.rtScore }
    })
  )

  return NextResponse.json({ movies: withRatings, topGenreNames })
}
