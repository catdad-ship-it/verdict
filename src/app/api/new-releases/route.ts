import { getNowPlaying, getUpcoming, getNewToStreaming } from '@/lib/tmdb'
import { getRatings } from '@/lib/omdb'
import { createClient } from '@/lib/supabase/server'
import { SEED_PROFILE, deriveGenrePreferences } from '@/lib/suggestions'
import { NextResponse } from 'next/server'

async function getUserTaste(): Promise<{ genres: number[]; exclude: Set<number> }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { genres: SEED_PROFILE.topGenreIds, exclude: new Set() }

    const [{ data: watched }, { data: queue }, { data: tasteProfile }] = await Promise.all([
      supabase.from('watched_movies').select('tmdb_id, genre_ids, user_rating').eq('user_id', user.id),
      supabase.from('queue_items').select('tmdb_id').eq('user_id', user.id),
      supabase.from('taste_profiles').select('disliked_tmdb_ids').eq('id', user.id).maybeSingle(),
    ])

    const derived = deriveGenrePreferences(
      (watched ?? []).map(w => ({ genreIds: w.genre_ids ?? [], userRating: w.user_rating })),
      [],
      [],
    )
    const sortedGenres = Object.entries(derived)
      .filter(([, s]) => s > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([id]) => parseInt(id))

    const exclude = new Set<number>([
      ...(watched ?? []).map(w => w.tmdb_id),
      ...(queue ?? []).map(q => q.tmdb_id),
      ...(tasteProfile?.disliked_tmdb_ids ?? []),
    ])

    return {
      genres: sortedGenres.length > 0 ? sortedGenres : SEED_PROFILE.topGenreIds,
      exclude,
    }
  } catch {
    return { genres: SEED_PROFILE.topGenreIds, exclude: new Set() }
  }
}

export async function GET() {
  try {
    const [nowPlaying, upcoming, streaming, taste] = await Promise.all([
      getNowPlaying(),
      getUpcoming(),
      getNewToStreaming(),
      getUserTaste(),
    ])

    const { genres: preferredGenres, exclude } = taste
    const matches = (m: { genreIds: number[]; id: number }) =>
      m.genreIds.some(id => preferredGenres.includes(id)) && !exclude.has(m.id)

    const nowFiltered    = nowPlaying.filter(m => matches(m))
    const soonFiltered   = upcoming.filter(m => matches(m))
    const streamFiltered = streaming.filter(m => matches(m))

    const nowWithRatings = await Promise.all(
      nowFiltered.map(async m => {
        const r = await getRatings(m.title, m.releaseYear)
        return { ...m, imdbRating: r.imdbRating ?? m.imdbRating, rtScore: r.rtScore }
      })
    )

    return NextResponse.json({
      nowPlaying: nowWithRatings,
      upcoming: soonFiltered,
      streaming: streamFiltered,
    })
  } catch (e) {
    console.error('new-releases error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
