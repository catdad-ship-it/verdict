import { createClient } from '@/lib/supabase/server'
import { CURATED_PROVIDERS, normalizeProviderName } from '@/lib/streamingServices'
import { NextRequest, NextResponse } from 'next/server'
import type { StreamProvider } from '../route'

const BASE = 'https://api.themoviedb.org/3'
const KEY  = process.env.TMDB_API_KEY

interface BatchEntry {
  tmdbId: number
  mediaType: 'movie' | 'tv'
}

interface ProviderResult {
  providers: StreamProvider[]
  ownedProviders: StreamProvider[]
  hasRent: boolean
  hasBuy: boolean
}

// Normalized names of services the user owns — matching by name instead of
// raw provider_id so TMDB's ad-tier duplicate rows still count as owned.
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

async function fetchOne(tmdbId: number, mediaType: 'movie' | 'tv', ownedNames: Set<string>): Promise<ProviderResult> {
  const path = mediaType === 'tv' ? `/tv/${tmdbId}/watch/providers` : `/movie/${tmdbId}/watch/providers`
  const url  = `${BASE}${path}?api_key=${KEY}`

  try {
    const data = await fetch(url, { next: { revalidate: 86400 } }).then(r => r.json())
    const us   = data?.results?.US

    type RawProvider = { provider_id: number; provider_name: string; logo_path: string; display_priority: number }

    // Dedupe by normalized name — same reasoning as /api/providers.
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

    return {
      providers,
      ownedProviders: providers.filter(p => ownedNames.has(normalizeProviderName(p.providerName))),
      hasRent: !!(us?.rent?.length),
      hasBuy:  !!(us?.buy?.length),
    }
  } catch {
    return { providers: [], ownedProviders: [], hasRent: false, hasBuy: false }
  }
}

// POST /api/providers/batch  { items: [{ tmdbId, mediaType }, ...] }
// Returns { [`${mediaType}:${tmdbId}`]: { providers, hasRent, hasBuy } }
// Lets the page fetch provider data for an entire screen of cards in one
// round trip instead of one fetch per VHSCard (was causing 20-40+ parallel
// client requests on pages like Home/Suggestions/New Releases).
export async function POST(req: NextRequest) {
  let items: BatchEntry[] = []
  try {
    const body = await req.json()
    items = Array.isArray(body?.items) ? body.items : []
  } catch {
    return NextResponse.json({ results: {} })
  }

  if (!KEY || items.length === 0) {
    return NextResponse.json({ results: {} })
  }

  // De-dupe — the same title can appear in multiple shelves (e.g. queue + trending)
  const seen = new Map<string, BatchEntry>()
  for (const item of items) {
    if (!item || !item.tmdbId) continue
    const mediaType = item.mediaType === 'tv' ? 'tv' : 'movie'
    seen.set(`${mediaType}:${item.tmdbId}`, { tmdbId: item.tmdbId, mediaType })
  }

  const entries = Array.from(seen.entries())
  const ownedNames = await getOwnedNames()
  const settled = await Promise.all(entries.map(([, e]) => fetchOne(e.tmdbId, e.mediaType, ownedNames)))

  const results: Record<string, ProviderResult> = {}
  entries.forEach(([key], i) => {
    results[key] = settled[i]
  })

  return NextResponse.json({ results })
}
