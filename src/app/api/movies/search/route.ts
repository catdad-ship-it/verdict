import { searchMovies } from '@/lib/tmdb'
import { getRatings } from '@/lib/omdb'
import { badRequest } from '@/lib/validate'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return badRequest('q is required')
  try {
    const movies = await searchMovies(q)
    const withRatings = await Promise.all(
      movies.map(async m => {
        const r = await getRatings(m.title, m.releaseYear)
        return { ...m, ...r }
      })
    )
    return NextResponse.json(withRatings)
  } catch {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
