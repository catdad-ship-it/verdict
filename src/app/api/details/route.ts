import { getMovieDetails, getShowDetails } from '@/lib/tmdb'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/details?tmdbId=123&mediaType=movie
// Backs the click-to-expand title modal: full synopsis, genre names, top
// cast, and director/creators — the stuff that doesn't fit on a VHSCard.
export async function GET(req: NextRequest) {
  const tmdbId    = req.nextUrl.searchParams.get('tmdbId')
  const mediaType = req.nextUrl.searchParams.get('mediaType') ?? 'movie'
  if (!tmdbId) return NextResponse.json({ error: 'tmdbId required' }, { status: 400 })

  try {
    const details = mediaType === 'tv'
      ? await getShowDetails(Number(tmdbId))
      : await getMovieDetails(Number(tmdbId))
    return NextResponse.json(details)
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
