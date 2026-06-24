import { getNowPlaying, getUpcoming } from '@/lib/tmdb'
import { getRatings } from '@/lib/omdb'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [nowPlaying, upcoming] = await Promise.all([getNowPlaying(), getUpcoming()])
    const nowWithRatings = await Promise.all(
      nowPlaying.map(async m => {
        const r = await getRatings(m.title, m.releaseYear)
        return { ...m, imdbRating: r.imdbRating ?? m.imdbRating, rtScore: r.rtScore }
      })
    )
    return NextResponse.json({ nowPlaying: nowWithRatings, upcoming })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
