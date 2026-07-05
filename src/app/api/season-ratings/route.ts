import { createClient } from '@/lib/supabase/server'
import { isFiniteNumber, isIntInRange, badRequest } from '@/lib/validate'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { show_tmdb_id, season_number, user_rating, what_worked, notes } = await req.json()

  if (!isFiniteNumber(show_tmdb_id)) return badRequest('show_tmdb_id is required')
  if (!isIntInRange(season_number, 0, 100)) return badRequest('season_number must be an integer 0-100')
  if (!isIntInRange(user_rating, 1, 5)) return badRequest('user_rating must be an integer 1-5')

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
