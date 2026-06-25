import { createClient } from '@/lib/supabase/server'
import { getMovieSuggestions, deriveGenrePreferences, SEED_PROFILE } from '@/lib/suggestions'
import { getRatings } from '@/lib/omdb'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Extra IDs to exclude (already shown movies)
  const extraExclude = (req.nextUrl.searchParams.get('excludeIds') ?? '')
    .split(',').filter(Boolean).map(Number)

  const [
    { data: watched },
    { data: queue },
    { data: watchedShows },
    { data: tasteProfile },
  ] = await Promise.all([
    supabase.from('watched_movies').select('tmdb_id, genre_ids, user_rating, want_more_like_this').eq('user_id', user.id),
    supabase.from('queue_items').select('tmdb_id, genre_ids').eq('user_id', user.id),
    supabase.from('watched_shows').select('tmdb_id, genre_ids').eq('user_id', user.id),
    supabase.from('taste_profiles').select('disliked_tmdb_ids').eq('id', user.id).maybeSingle(),
  ])

  const watchedIds   = watched?.map(w => w.tmdb_id) ?? []
  const queueIds     = queue?.map(q => q.tmdb_id) ?? []
  const dismissedIds = tasteProfile?.disliked_tmdb_ids ?? []

  // Top-rated movies (4-5 stars) where user wants more like it — used for TMDB recs
  const topRatedMovieIds = (watched ?? [])
    .filter(w => w.user_rating != null && w.user_rating >= 4 && w.want_more_like_this !== false)
    .map(w => w.tmdb_id)

  const derived = deriveGenrePreferences(
    (watched ?? []).map(w => ({ genreIds: w.genre_ids ?? [], userRating: w.user_rating, wantMoreLikeThis: w.want_more_like_this })),
    (queue ?? []).map(q => ({ genreIds: q.genre_ids ?? [] })),
    (watchedShows ?? []).map(s => ({ genreIds: s.genre_ids ?? [] })),
  )
  const genreIds = derived.length > 0 ? derived : SEED_PROFILE.topGenreIds

  const movies = await getMovieSuggestions({
    lovedGenreIds: genreIds,
    watchedIds,
    queueIds,
    dismissedIds: [...dismissedIds, ...extraExclude],
    topRatedMovieIds,
  })

  const withRatings = await Promise.all(
    movies.slice(0, 24).map(async m => {
      const r = await getRatings(m.title, m.releaseYear)
      return { ...m, imdbRating: r.imdbRating ?? m.imdbRating, rtScore: r.rtScore }
    })
  )

  return NextResponse.json(withRatings)
}
