import { createClient } from '@/lib/supabase/server'
import { CURATED_PROVIDER_IDS } from '@/lib/streamingServices'
import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://api.themoviedb.org/3'
const KEY  = process.env.TMDB_API_KEY

export interface ServiceOption {
  id: number
  name: string
  logoPath: string | null
}

// Pull live name/logo data for our curated ID list from TMDB's master
// provider list, rather than hardcoding logo paths that could go stale.
async function getCuratedServices(): Promise<ServiceOption[]> {
  if (!KEY) return []
  try {
    const data = await fetch(`${BASE}/watch/providers/movie?watch_region=US&api_key=${KEY}`, {
      next: { revalidate: 604800 }, // provider metadata barely ever changes — cache a week
    }).then(r => r.json())

    type Raw = { provider_id: number; provider_name: string; logo_path: string | null }
    const byId = new Map<number, Raw>((data?.results ?? []).map((p: Raw) => [p.provider_id, p]))

    return CURATED_PROVIDER_IDS
      .map(id => byId.get(id))
      .filter((p): p is Raw => !!p)
      .map(p => ({ id: p.provider_id, name: p.provider_name, logoPath: p.logo_path }))
  } catch {
    return []
  }
}

// GET /api/settings/streaming-services → { services, selected }
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [services, { data: profile }] = await Promise.all([
    getCuratedServices(),
    supabase.from('profiles').select('streaming_provider_ids').eq('id', user.id).maybeSingle(),
  ])

  return NextResponse.json({
    services,
    selected: profile?.streaming_provider_ids ?? [],
  })
}

// POST /api/settings/streaming-services  { providerIds: number[] }
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { providerIds } = await req.json()
  if (!Array.isArray(providerIds)) {
    return NextResponse.json({ error: 'providerIds must be an array' }, { status: 400 })
  }

  const cleaned = providerIds.filter((id): id is number => typeof id === 'number')

  const { error } = await supabase
    .from('profiles')
    .update({ streaming_provider_ids: cleaned })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
