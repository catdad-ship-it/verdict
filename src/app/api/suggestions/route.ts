import { createClient } from '@/lib/supabase/server'
import { getMovieSuggestions, deriveGenrePreferences, SEED_PROFILE } from '@/lib/suggestions'
import { getRatings } from '@/lib/omdb'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: watched }, { data: queue }, { data: tasteProfile }] = await Promise.all([
    supabase.from('watched_movies').select('tmdb_id, genre_ids, user_rating').eq('user_id', user.id),
    supabase.from('queue_items').select('tmdb_id').eq('user_id', user.id),
    supabase.from('taste_profiles').select('disliked_tmdb_ids').eq('id', user.id).maybeSingle(),
  ])

  const watchedIds   = watched?.map(w => w.tmdb_id) ?? []
  const queueIds     = queue?.map(q => q.tmdb_id) ?? []
  const dismissedIds = tasteProfile?.disliked_tmdb_ids ?? []

  const derived = deriveGenrePreferences(
    (watched ?? []).map(w => ({ genreIds: w.genre_ids ?? [], userRating: w.user_rating }))
  )
  const genreIds = derived.length > 0 ? derived : SEED_PROFILE.topGenreIds

  const movies = await getMovieSuggestions({ lovedGenreIds: genreIds, watchedIds, queueIds, dismissedIds })

  const withRatings = await Promise.all(
    movies.slice(0, 12).map(async m => {
      const r = await getRatings(m.title, m.releaseYear)
      return { ...m, imdbRating: r.imdbRating ?? m.imdbRating, rtScore: r.rtScore }
    })
  )

  return NextResponse.json(withRatings)
}
