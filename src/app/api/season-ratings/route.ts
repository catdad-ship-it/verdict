import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { show_tmdb_id, season_number, user_rating, what_worked, notes } = await req.json()

  // Get show id
  const { data: show } = await supabase
    .from('watched_shows')
    .select('id')
    .eq('user_id', user.id)
    .eq('tmdb_id', show_tmdb_id)
    .single()

  if (!show) return NextResponse.json({ error: 'Show not found' }, { status: 404 })

  const { error } = await supabase.from('season_ratings').upsert({
    watched_show_id: show.id,
    season_number,
    user_rating,
    what_worked: what_worked ?? [],
    notes,
  }, { onConflict: 'watched_show_id,season_number' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
