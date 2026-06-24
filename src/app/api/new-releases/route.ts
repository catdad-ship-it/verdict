import { getNowPlaying, getUpcoming, getNewToStreaming } from '@/lib/tmdb'
import { getRatings } from '@/lib/omdb'
import { createClient } from '@/lib/supabase/server'
import { SEED_PROFILE, deriveGenrePreferences } from '@/lib/suggestions'
import { NextResponse } from 'next/server'

async function getUserGenres(): Promise<number[]> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return SEED_PROFILE.topGenreIds

    const { data: watched } = await supabase
      .from('watched_movies')
      .select('genre_ids, user_rating')
      .eq('user_id', user.id)

    const derived = deriveGenrePreferences(
      (watched ?? []).map(w => ({ genreIds: w.genre_ids ?? [], userRating: w.user_rating }))
    )
    return derived.length > 0 ? derived : SEED_PROFILE.topGenreIds
  } catch {
    return SEED_PROFILE.topGenreIds
  }
}

export async function GET() {
  try {
    const [nowPlaying, upcoming, streaming, preferredGenres] = await Promise.all([
      getNowPlaying(),
      getUpcoming(),
      getNewToStreaming(),
      getUserGenres(),
    ])

    const matches = (genreIds: number[]) =>
      genreIds.some(id => preferredGenres.includes(id))

    const nowFiltered  = nowPlaying.filter(m => matches(m.genreIds))
    const soonFiltered = upcoming.filter(m => matches(m.genreIds))
    const streamFiltered = streaming.filter(m => matches(m.genreIds))

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
