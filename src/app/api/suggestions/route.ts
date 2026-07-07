import { createClient } from '@/lib/supabase/server'
import { getMovieSuggestions, deriveGenrePreferences, getCastCrewCandidates, SEED_PROFILE, MOOD_GENRES, type Mood } from '@/lib/suggestions'
import { getRatings } from '@/lib/omdb'
import { TMDB_GENRES } from '@/lib/types'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const moodParam = req.nextUrl.searchParams.get('mood') ?? ''

  // COMFORT REWATCH — the one mood that surfaces things you've already seen
  // and loved, rather than new discovery. Movies you rated 4-5★ plus TV series
  // you finished. No TMDB calls; it's all from your own watch history.
  if (moodParam === 'comfort') return comfortRewatch(supabase, user.id)

  const mood = (moodParam in MOOD_GENRES ? moodParam : null) as Mood | null

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

  // Mood boost — a big flat bump on the mood's genres so they dominate the
  // discover targeting and ranking, while the user's real taste still orders
  // titles within the mood. Combined with the post-filter below, results stay
  // on-vibe. `moodGenreSet` is used after suggestions come back.
  const moodGenreSet = mood ? new Set(MOOD_GENRES[mood]) : null
  if (mood) for (const gId of MOOD_GENRES[mood]) genreScores[gId] = (genreScores[gId] ?? 0) + 100

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

  // Keep only on-vibe titles when a mood is active — drops off-mood
  // recommendation/cast-crew noise that slipped past the genre boost.
  const onVibe = moodGenreSet
    ? movies.filter(m => m.genreIds.some(g => moodGenreSet.has(g)))
    : movies

  const withRatings = await Promise.all(
    onVibe.slice(0, 24).map(async m => {
      const r = await getRatings(m.title, m.releaseYear)
      return { ...m, imdbRating: r.imdbRating ?? m.imdbRating, rtScore: r.rtScore }
    })
  )

  return NextResponse.json({ movies: withRatings, topGenreNames })
}

// COMFORT REWATCH branch — favorites from watch history, movies + finished TV,
// shuffled together. Each carries a mediaType so the grid can render TV cards.
async function comfortRewatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const [{ data: movies }, { data: shows }] = await Promise.all([
    supabase
      .from('watched_movies')
      .select('tmdb_id, title, poster_path, genre_ids, runtime, release_year, imdb_rating, rt_score, user_rating')
      .eq('user_id', userId)
      .gte('user_rating', 4),
    supabase
      .from('watched_shows')
      .select('tmdb_id, title, poster_path, genre_ids, episode_runtime')
      .eq('user_id', userId)
      .eq('status', 'finished'),
  ])

  const comfortMovies = (movies ?? []).map(m => ({
    id: m.tmdb_id, title: m.title, posterPath: m.poster_path, mediaType: 'movie' as const,
    genreIds: m.genre_ids ?? [], runtime: m.runtime, releaseYear: m.release_year,
    imdbRating: m.imdb_rating, rtScore: m.rt_score,
    matchReason: `You rated this ★${m.user_rating}`,
  }))

  const comfortShows = (shows ?? []).map(s => ({
    id: s.tmdb_id, title: s.title, posterPath: s.poster_path, mediaType: 'tv' as const,
    genreIds: s.genre_ids ?? [], runtime: s.episode_runtime, releaseYear: null,
    imdbRating: null, rtScore: null,
    matchReason: 'You finished this — worth a rewatch',
  }))

  // Interleave movies + shows randomly so it isn't all films then all shows.
  const all = [...comfortMovies, ...comfortShows]
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[all[i], all[j]] = [all[j], all[i]]
  }

  return NextResponse.json({ movies: all, topGenreNames: [] })
}
