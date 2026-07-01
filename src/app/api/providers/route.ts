import { createClient } from '@/lib/supabase/server'
import { CURATED_PROVIDERS, normalizeProviderName } from '@/lib/streamingServices'
import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://api.themoviedb.org/3'
const KEY  = process.env.TMDB_API_KEY

export interface StreamProvider {
  providerId:   number
  providerName: string
  logoPath:     string
}

// Normalized names of services the user owns (e.g. {"netflix","hulu"}) —
// matching by name instead of raw provider_id so TMDB's ad-tier duplicate
// rows ("Netflix Standard with Ads" etc.) still count as owned.
async function getOwnedNames(): Promise<Set<string>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Set()
    const { data } = await supabase.from('profiles').select('streaming_provider_ids').eq('id', user.id).maybeSingle()
    const ownedIds = new Set<number>(data?.streaming_provider_ids ?? [])
    return new Set(
      CURATED_PROVIDERS.filter(p => ownedIds.has(p.id)).map(p => normalizeProviderName(p.name))
    )
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
    const [data, ownedNames] = await Promise.all([
      fetch(url, { next: { revalidate: 86400 } }).then(r => r.json()),
      getOwnedNames(),
    ])
    const us = data?.results?.US

    type RawProvider = { provider_id: number; provider_name: string; logo_path: string; display_priority: number }

    // Dedupe by normalized name — TMDB frequently lists the same real
    // service under two rows (a plain tier and an ad-supported tier with a
    // different provider_id/logo), which otherwise shows up as two near-
    // identical logos for one subscription.
    const seenNames = new Set<string>()
    const providers: StreamProvider[] = ((us?.flatrate ?? []) as RawProvider[])
      .sort((a, b) => a.display_priority - b.display_priority)
      .filter(p => {
        const key = normalizeProviderName(p.provider_name)
        if (seenNames.has(key)) return false
        seenNames.add(key)
        return true
      })
      .map(p => ({
        providerId:   p.provider_id,
        providerName: p.provider_name,
        logoPath:     p.logo_path,
      }))

    const ownedProviders = providers.filter(p => ownedNames.has(normalizeProviderName(p.providerName)))
    const hasRent = !!(us?.rent?.length)
    const hasBuy  = !!(us?.buy?.length)

    return NextResponse.json({ providers, ownedProviders, hasRent, hasBuy })
  } catch {
    return NextResponse.json({ providers: [], ownedProviders: [] })
  }
}
