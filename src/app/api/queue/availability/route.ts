import { createClient } from '@/lib/supabase/server'
import { getOwnedIds, fetchProviders } from '@/lib/providers'
import { NextResponse } from 'next/server'

interface AvailabilityChange {
  tmdbId: number
  mediaType: string
  title: string
  providerName?: string
}

// Only re-check a queue item's providers this often — TMDB provider data
// itself is cached 24h (see fetchProviders), and there's no point hitting
// TMDB again for every page load.
const STALE_MS = 20 * 60 * 60 * 1000
// Cap how many stale items get checked in one request so a large queue
// doesn't turn a page load into dozens of sequential TMDB calls.
const MAX_CHECKED = 30

// GET /api/queue/availability — diffs each queue item's currently-owned
// providers against the last snapshot taken, updating the snapshot and
// reporting what changed. No cron/background job here (this repo has none
// wired up) — the check just piggybacks on whichever page load happens to
// find a stale-enough snapshot, which is enough to surface "NOW ON X" /
// "no longer on X" without new infrastructure.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [ownedIds, { data: items }] = await Promise.all([
    getOwnedIds(),
    supabase.from('queue_items')
      .select('id, tmdb_id, media_type, title, last_owned_provider_ids, providers_checked_at')
      .eq('user_id', user.id),
  ])

  if (ownedIds.size === 0 || !items || items.length === 0) {
    return NextResponse.json({ becameAvailable: [], noLongerAvailable: [] })
  }

  const now = Date.now()
  const stale = items
    .filter(i => !i.providers_checked_at || now - new Date(i.providers_checked_at).getTime() > STALE_MS)
    .slice(0, MAX_CHECKED)

  const becameAvailable: AvailabilityChange[] = []
  const noLongerAvailable: AvailabilityChange[] = []

  await Promise.all(stale.map(async item => {
    const mediaType = item.media_type === 'tv' ? 'tv' : 'movie'
    const { ownedProviders } = await fetchProviders(item.tmdb_id, mediaType, ownedIds)
    const currentIds: number[] = ownedProviders.map(p => p.providerId)
    const prevIds: number[] = item.last_owned_provider_ids ?? []

    const newlyOwned = ownedProviders.find(p => !prevIds.includes(p.providerId))
    if (newlyOwned) {
      becameAvailable.push({ tmdbId: item.tmdb_id, mediaType: item.media_type, title: item.title, providerName: newlyOwned.providerName })
    }
    // Only flag "no longer available" if it had an owned provider before
    // and has none now — losing one of several owned providers isn't
    // worth surfacing since it's likely still watchable on another.
    if (prevIds.length > 0 && currentIds.length === 0) {
      noLongerAvailable.push({ tmdbId: item.tmdb_id, mediaType: item.media_type, title: item.title })
    }

    await supabase.from('queue_items')
      .update({ last_owned_provider_ids: currentIds, providers_checked_at: new Date().toISOString() })
      .eq('id', item.id)
  }))

  return NextResponse.json({ becameAvailable, noLongerAvailable })
}
