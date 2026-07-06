import { getOwnedIds, fetchProviders } from '@/lib/providers'
import type { ProviderResult } from '@/lib/providers'
import { NextRequest, NextResponse } from 'next/server'

const KEY = process.env.TMDB_API_KEY

interface BatchEntry {
  tmdbId: number
  mediaType: 'movie' | 'tv'
}

// POST /api/providers/batch  { items: [{ tmdbId, mediaType }, ...] }
// Returns { [`${mediaType}:${tmdbId}`]: { providers, hasRent, hasBuy } }
// Lets the page fetch provider data for an entire screen of cards in one
// round trip instead of one fetch per VHSCard (was causing 20-40+ parallel
// client requests on pages like Home/Suggestions/New Releases).
const MAX_ITEMS = 200
const MAX_ENTRIES = 60

export async function POST(req: NextRequest) {
  let items: BatchEntry[] = []
  try {
    const body = await req.json()
    items = Array.isArray(body?.items) ? body.items : []
  } catch {
    return NextResponse.json({ results: {} })
  }

  if (items.length > MAX_ITEMS) {
    return NextResponse.json({ error: `items exceeds max of ${MAX_ITEMS}` }, { status: 400 })
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

  const entries = Array.from(seen.entries()).slice(0, MAX_ENTRIES)
  const ownedIds = await getOwnedIds()
  const settled = await Promise.all(entries.map(([, e]) => fetchProviders(e.tmdbId, e.mediaType, ownedIds)))

  const results: Record<string, ProviderResult> = {}
  entries.forEach(([key], i) => {
    results[key] = settled[i]
  })

  return NextResponse.json({ results })
}
