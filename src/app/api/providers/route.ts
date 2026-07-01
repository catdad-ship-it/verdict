import { createClient } from '@/lib/supabase/server'
import { canonicalizeAndDedupe } from '@/lib/streamingServices'
import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://api.themoviedb.org/3'
const KEY  = process.env.TMDB_API_KEY

export interface StreamProvider {
  providerId:   number
  providerName: string
  logoPath:     string
}

async function getOwnedIds(): Promise<Set<number>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Set()
    const { data } = await supabase.from('profiles').select('streaming_provider_ids').eq('id', user.id).maybeSingle()
    return new Set(data?.streaming_provider_ids ?? [])
  } catch {
    return new Set()
  }
}

// GET /api/providers?tmdbId=123&mediaType=movie
export async function GET(req: NextRequest) {
  const tmdbId    = req.nextUrl.searchParams.get('tmdbId')
  const mediaType = req.nextUrl.searchParams.get('mediaType') ?? 'movie'
  if (!tmdbId) return NextResponse.json({ providers: [] })

  const path = mediaType === 'tv' ? `/tv/${tmdbId}/watch/providers` : `/movie/${tmdbId}/watch/providers`
  const url  = `${BASE}${path}?api_key=${KEY}`

  try {
    const [data, ownedIds] = await Promise.all([
      fetch(url, { next: { revalidate: 86400 } }).then(r => r.json()),
      getOwnedIds(),
    ])
    const us = data?.results?.US

    type RawProvider = { provider_id: number; provider_name: string; logo_path: string; display_priority: number }

    // Canonicalize + dedupe — TMDB frequently lists one real service under
    // more than one provider_id/name (an ad-supported tier, a legacy
    // duplicate, a bundle channel). See streamingServices.ts.
    const raw = ((us?.flatrate ?? []) as RawProvider[]).sort((a, b) => a.display_priority - b.display_priority)
    const providers: StreamProvider[] = canonicalizeAndDedupe(
      raw.map(p => ({ providerId: p.provider_id, providerName: p.provider_name, logoPath: p.logo_path }))
    )

    const ownedProviders = providers.filter(p => ownedIds.has(p.providerId))
    const hasRent = !!(us?.rent?.length)
    const hasBuy  = !!(us?.buy?.length)

    return NextResponse.json({ providers, ownedProviders, hasRent, hasBuy })
  } catch {
    return NextResponse.json({ providers: [], ownedProviders: [] })
  }
}
