import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tmdb_id } = await req.json()
  if (!tmdb_id) return NextResponse.json({ error: 'Missing tmdb_id' }, { status: 400 })

  // Append to disliked_tmdb_ids in taste_profiles (upsert)
  const { data: existing } = await supabase
    .from('taste_profiles')
    .select('disliked_tmdb_ids')
    .eq('id', user.id)
    .maybeSingle()

  const current: number[] = existing?.disliked_tmdb_ids ?? []
  if (!current.includes(tmdb_id)) {
    const { error: upsertError } = await supabase.from('taste_profiles').upsert({
      id: user.id,
      disliked_tmdb_ids: [...current, tmdb_id],
      updated_at: new Date().toISOString(),
    })
    if (upsertError) console.error('dismiss upsert error:', JSON.stringify(upsertError))
  }

  return NextResponse.json({ ok: true })
}
