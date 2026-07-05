import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://api.themoviedb.org/3'
const KEY  = process.env.TMDB_API_KEY

// GET /api/trailer?tmdbId=123&mediaType=movie
export async function GET(req: NextRequest) {
  const tmdbId    = req.nextUrl.searchParams.get('tmdbId')
  const mediaType = req.nextUrl.searchParams.get('mediaType') ?? 'movie'
  if (!tmdbId) return NextResponse.json({ error: 'tmdbId required' }, { status: 400 })

  const path = mediaType === 'tv' ? `/tv/${tmdbId}/videos` : `/movie/${tmdbId}/videos`
  const url  = new URL(`${BASE}${path}`)
  url.searchParams.set('api_key', KEY ?? '')

  try {
    const data = await fetch(url.toString(), { next: { revalidate: 86400 } }).then(r => r.json())
    const videos: { key: string; site: string; type: string; official: boolean }[] = data.results ?? []

    // Prefer: official YouTube trailer → any YouTube trailer → teaser
    const trailer =
      videos.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.official) ??
      videos.find(v => v.site === 'YouTube' && v.type === 'Trailer') ??
      videos.find(v => v.site === 'YouTube' && v.type === 'Teaser')

    if (!trailer) return NextResponse.json({ url: null, key: null })
    return NextResponse.json({ url: `https://www.youtube.com/watch?v=${trailer.key}`, key: trailer.key })
  } catch {
    return NextResponse.json({ url: null, key: null })
  }
}
