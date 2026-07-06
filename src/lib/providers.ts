import { createClient } from '@/lib/supabase/server'
import { canonicalizeAndDedupe } from '@/lib/streamingServices'

export interface StreamProvider {
  providerId:   number
  providerName: string
  logoPath:     string
}

export interface ProviderResult {
  providers: StreamProvider[]
  ownedProviders: StreamProvider[]
  hasRent: boolean
  hasBuy: boolean
}

const BASE = 'https://api.themoviedb.org/3'
const KEY  = process.env.TMDB_API_KEY

export async function getOwnedIds(): Promise<Set<number>> {
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

// Shared by /api/providers, /api/providers/batch, and the queue
// availability check — one place that talks to TMDB's watch/providers
// endpoint and canonicalizes the result.
export async function fetchProviders(tmdbId: number, mediaType: 'movie' | 'tv', ownedIds: Set<number>): Promise<ProviderResult> {
  const path = mediaType === 'tv' ? `/tv/${tmdbId}/watch/providers` : `/movie/${tmdbId}/watch/providers`
  const url  = `${BASE}${path}?api_key=${KEY}`

  try {
    const data = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000) }).then(r => r.json())
    const us   = data?.results?.US

    type RawProvider = { provider_id: number; provider_name: string; logo_path: string; display_priority: number }

    const raw = ((us?.flatrate ?? []) as RawProvider[]).sort((a, b) => a.display_priority - b.display_priority)
    const providers: StreamProvider[] = canonicalizeAndDedupe(
      raw.map(p => ({ providerId: p.provider_id, providerName: p.provider_name, logoPath: p.logo_path }))
    )

    return {
      providers,
      ownedProviders: providers.filter(p => ownedIds.has(p.providerId)),
      hasRent: !!(us?.rent?.length),
      hasBuy:  !!(us?.buy?.length),
    }
  } catch {
    return { providers: [], ownedProviders: [], hasRent: false, hasBuy: false }
  }
}
