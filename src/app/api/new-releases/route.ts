import { getNowPlaying, getUpcoming, getNewToStreaming } from '@/lib/tmdb'
import { getRatings } from '@/lib/omdb'
import { createClient } from '@/lib/supabase/server'
import { SEED_PROFILE, deriveGenrePreferences } from '@/lib/suggestions'
import { NextResponse } from 'next/server'

interface UserTaste {
  genres: number[]
  exclude: Set<number>
  excludeGenres: Set<number>
  hiddenShelves: Set<string>
}

async function getUserTaste(): Promise<UserTaste> {
  const empty: UserTaste = { genres: SEED_PROFILE.topGenreIds, exclude: new Set(), excludeGenres: new Set(), hiddenShelves: new Set() }
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return empty

    const [{ data: watched }, { data: queue }, { data: tasteProfile }, { data: profile }] = await Promise.all([
      supabase.from('watched_movies').select('tmdb_id, genre_ids, user_rating').eq('user_id', user.id),
      supabase.from('queue_items').select('tmdb_id').eq('user_id', user.id),
      supabase.from('taste_profiles').select('disliked_tmdb_ids, preferred_genre_ids, excluded_genre_ids').eq('id', user.id).maybeSingle(),
      supabase.from('profiles').select('hidden_shelves').eq('id', user.id).maybeSingle(),
    ])

    const derived = deriveGenrePreferences(
      (watched ?? []).map(w => ({ genreIds: w.genre_ids ?? [], userRating: w.user_rating })),
      [],
      [],
    )
    // Explicit Settings picks are a strong signal — always included whether
    // or not the auto-derived history already covers them.
    const preferredGenreIds = tasteProfile?.preferred_genre_ids ?? []
    const sortedGenres = Object.entries(derived)
      .filter(([, s]) => s > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([id]) => parseInt(id))
    const genres = [...new Set([...preferredGenreIds, ...(sortedGenres.length > 0 ? sortedGenres : SEED_PROFILE.topGenreIds)])]

    const exclude = new Set<number>([
      ...(watched ?? []).map(w => w.tmdb_id),
      ...(queue ?? []).map(q => q.tmdb_id),
      ...(tasteProfile?.disliked_tmdb_ids ?? []),
    ])

    return {
      genres,
      exclude,
      excludeGenres: new Set(tasteProfile?.excluded_genre_ids ?? []),
      hiddenShelves: new Set(profile?.hidden_shelves ?? []),
    }
  } catch {
    return empty
  }
}

export async function GET() {
  try {
    const taste = await getUserTaste()
    const { genres: preferredGenres, exclude, excludeGenres, hiddenShelves } = taste

    const [nowPlaying, upcoming, streaming] = await Promise.all([
      hiddenShelves.has('now_playing')       ? Promise.resolve([]) : getNowPlaying(),
      hiddenShelves.has('coming_soon')       ? Promise.resolve([]) : getUpcoming(),
      hiddenShelves.has('new_to_streaming')  ? Promise.resolve([]) : getNewToStreaming(),
    ])

    const matches = (m: { genreIds: number[]; id: number }) =>
      m.genreIds.some(id => preferredGenres.includes(id)) &&
      !m.genreIds.some(id => excludeGenres.has(id)) &&
      !exclude.has(m.id)

    const nowFiltered    = nowPlaying.filter(m => matches(m))
    const soonFiltered   = upcoming.filter(m => matches(m))
    const streamFiltered = streaming.filter(m => matches(m))

    // Bound OMDB enrichment — Now Playing can carry ~40 titles and every
    // enrichment is an OMDB round trip against a 1,000/day free tier.
    // The rest still ship with their TMDB-derived rating, just no RT score.
    const nowToEnrich = nowFiltered.slice(0, 20)
    const nowRest      = nowFiltered.slice(20)
    const nowWithRatings = await Promise.all(
      nowToEnrich.map(async m => {
        const r = await getRatings(m.title, m.releaseYear)
        return { ...m, imdbRating: r.imdbRating ?? m.imdbRating, rtScore: r.rtScore }
      })
    )

    return NextResponse.json({
      nowPlaying: [...nowWithRatings, ...nowRest],
      upcoming: soonFiltered,
      streaming: streamFiltered,
    })
  } catch (e) {
    console.error('new-releases error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
