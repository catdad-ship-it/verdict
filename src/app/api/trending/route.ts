import { getTrendingMovies as getRedditMovies, getTrendingShows as getRedditShows } from '@/lib/reddit'
import { getTrendingMovies as getTraktMovies, getTrendingShows as getTraktShows, traktConfigured } from '@/lib/trakt'
import { getMovie, getShow, searchMovies, searchShows } from '@/lib/tmdb'
import { NextResponse } from 'next/server'

// Trakt gives us a direct TMDB id on every trending result, so once a
// TRAKT_CLIENT_ID is configured this is a straight lookup — no more
// fuzzy-matching a scraped Reddit post title against a TMDB search.
// Until then (or if Trakt has a bad day), fall back to the Reddit scrape
// so the shelf never just goes empty.
async function trendingViaTrakt() {
  const [traktMovies, traktShows] = await Promise.all([getTraktMovies(6), getTraktShows(4)])
  const movies = await Promise.all(
    traktMovies.map(async t => {
      try {
        const m = await getMovie(t.tmdbId)
        return { ...m, watchers: t.watchers }
      } catch { return null }
    })
  )
  const shows = await Promise.all(
    traktShows.map(async t => {
      try {
        const s = await getShow(t.tmdbId)
        return { ...s, watchers: t.watchers }
      } catch { return null }
    })
  )
  return { movies: movies.filter(Boolean), shows: shows.filter(Boolean) }
}

async function trendingViaReddit() {
  const [trendingMovies, trendingShows] = await Promise.all([getRedditMovies(), getRedditShows()])
  const matchMovies = await Promise.all(
    trendingMovies.slice(0, 6).map(async t => {
      const results = await searchMovies(t.extractedTitle)
      if (!results.length) return null
      return { ...results[0], watchers: t.score }
    })
  )
  const matchShows = await Promise.all(
    trendingShows.slice(0, 4).map(async t => {
      const results = await searchShows(t.extractedTitle)
      if (!results.length) return null
      return { ...results[0], watchers: t.score }
    })
  )
  return { movies: matchMovies.filter(Boolean), shows: matchShows.filter(Boolean) }
}

export async function GET() {
  try {
    const result = traktConfigured() ? await trendingViaTrakt() : await trendingViaReddit()
    // If Trakt came back empty (e.g. a bad response) still try Reddit rather than showing nothing.
    if (traktConfigured() && result.movies.length === 0 && result.shows.length === 0) {
      return NextResponse.json(await trendingViaReddit())
    }
    return NextResponse.json(result)
  } catch {
    try {
      return NextResponse.json(await trendingViaReddit())
    } catch {
      return NextResponse.json({ movies: [], shows: [] }, { status: 500 })
    }
  }
}
