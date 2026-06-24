import { getNowPlaying, getUpcoming, getNewToStreaming } from '@/lib/tmdb'
import { getRatings } from '@/lib/omdb'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [nowPlaying, upcoming, streaming] = await Promise.all([
      getNowPlaying(),
      getUpcoming(),
      getNewToStreaming(),
    ])
    const nowWithRatings = await Promise.all(
      nowPlaying.map(async m => {
        const r = await getRatings(m.title, m.releaseYear)
        return { ...m, imdbRating: r.imdbRating ?? m.imdbRating, rtScore: r.rtScore }
      })
    )
    return NextResponse.json({ nowPlaying: nowWithRatings, upcoming, streaming })
  } catch (e) {
    console.error('new-releases error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
