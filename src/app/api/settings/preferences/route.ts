import { createClient } from '@/lib/supabase/server'
import { SHELF_KEYS, QUEUE_SORTS } from '@/lib/preferences'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/settings/preferences
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: profile }, { data: taste }] = await Promise.all([
    supabase.from('profiles').select('hidden_shelves, default_queue_sort').eq('id', user.id).maybeSingle(),
    supabase.from('taste_profiles').select('preferred_genre_ids, excluded_genre_ids').eq('id', user.id).maybeSingle(),
  ])

  return NextResponse.json({
    hiddenShelves:     profile?.hidden_shelves ?? [],
    defaultQueueSort:  profile?.default_queue_sort ?? 'added',
    preferredGenreIds: taste?.preferred_genre_ids ?? [],
    excludedGenreIds:  taste?.excluded_genre_ids ?? [],
  })
}

// POST /api/settings/preferences  { hiddenShelves?, defaultQueueSort?, preferredGenreIds?, excludedGenreIds? }
// Partial update — only the keys present in the body are touched, so this
// can be called separately from the New Releases, Suggestions, or Queue
// sections of Settings without clobbering the others.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const numArray = (v: unknown) => Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number') : undefined
  const strArray = (v: unknown) => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined

  const profilePatch: Record<string, unknown> = {}
  if (body.hiddenShelves !== undefined) {
    const cleaned = strArray(body.hiddenShelves)?.filter(s => (SHELF_KEYS as readonly string[]).includes(s))
    if (cleaned) profilePatch.hidden_shelves = cleaned
  }
  if (body.defaultQueueSort !== undefined && (QUEUE_SORTS as readonly string[]).includes(body.defaultQueueSort)) {
    profilePatch.default_queue_sort = body.defaultQueueSort
  }

  const tastePatch: Record<string, unknown> = {}
  if (body.preferredGenreIds !== undefined) {
    const cleaned = numArray(body.preferredGenreIds)
    if (cleaned) tastePatch.preferred_genre_ids = cleaned
  }
  if (body.excludedGenreIds !== undefined) {
    const cleaned = numArray(body.excludedGenreIds)
    if (cleaned) tastePatch.excluded_genre_ids = cleaned
  }

  const writes = []
  if (Object.keys(profilePatch).length > 0) {
    writes.push(supabase.from('profiles').upsert({ id: user.id, ...profilePatch }, { onConflict: 'id' }))
  }
  if (Object.keys(tastePatch).length > 0) {
    writes.push(supabase.from('taste_profiles').upsert({ id: user.id, ...tastePatch }, { onConflict: 'id' }))
  }

  const results = await Promise.all(writes)
  const error = results.find(r => r.error)?.error
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
