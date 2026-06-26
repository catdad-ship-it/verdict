import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://api.themoviedb.org/3'
const KEY  = process.env.TMDB_API_KEY

export interface StreamProvider {
  providerId:   number
  providerName: string
  logoPath:     string
}

// GET /api/providers?tmdbId=123&mediaType=movie
export async function GET(req: NextRequest) {
  const tmdbId    = req.nextUrl.searchParams.get('tmdbId')
  const mediaType = req.nextUrl.searchParams.get('mediaType') ?? 'movie'
  if (!tmdbId) return NextResponse.json({ providers: [] })

  const path = mediaType === 'tv' ? `/tv/${tmdbId}/watch/providers` : `/movie/${tmdbId}/watch/providers`
  const url  = `${BASE}${path}?api_key=${KEY}`

  try {
    const data = await fetch(url, { next: { revalidate: 86400 } }).then(r => r.json())
    const us   = data?.results?.US

    type RawProvider = { provider_id: number; provider_name: string; logo_path: string; display_priority: number }

    const providers: StreamProvider[] = ((us?.flatrate ?? []) as RawProvider[])
      .sort((a, b) => a.display_priority - b.display_priority)
      .map(p => ({
        providerId:   p.provider_id,
        providerName: p.provider_name,
        logoPath:     p.logo_path,
      }))

    const hasRent = !!(us?.rent?.length)
    const hasBuy  = !!(us?.buy?.length)

    return NextResponse.json({ providers, hasRent, hasBuy })
  } catch {
    return NextResponse.json({ providers: [] })
  }
}
