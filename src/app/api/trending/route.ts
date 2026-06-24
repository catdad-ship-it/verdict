import { getTrendingMovies, getTrendingShows } from '@/lib/reddit'
import { searchMovies, searchShows } from '@/lib/tmdb'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [trendingMovies, trendingShows] = await Promise.all([
      getTrendingMovies(), getTrendingShows()
    ])

    // Try to match each Reddit title to a TMDB result
    const matchMovies = await Promise.all(
      trendingMovies.slice(0, 6).map(async t => {
        const results = await searchMovies(t.extractedTitle)
        if (!results.length) return null
        return { ...results[0], redditVotes: t.score, redditUrl: t.redditUrl }
      })
    )
    const matchShows = await Promise.all(
      trendingShows.slice(0, 4).map(async t => {
        const results = await searchShows(t.extractedTitle)
        if (!results.length) return null
        return { ...results[0], redditVotes: t.score, redditUrl: t.redditUrl }
      })
    )

    return NextResponse.json({
      movies: matchMovies.filter(Boolean),
      shows:  matchShows.filter(Boolean),
    })
  } catch {
    return NextResponse.json({ movies: [], shows: [] }, { status: 500 })
  }
}
