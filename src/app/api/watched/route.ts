import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: movies }, { data: shows }] = await Promise.all([
    supabase.from('watched_movies').select('*').eq('user_id', user.id).order('watched_at', { ascending: false }),
    supabase.from('watched_shows').select('*, season_ratings(*)').eq('user_id', user.id).order('updated_at', { ascending: false }),
  ])

  return NextResponse.json({ movies: movies ?? [], shows: shows ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { media_type, ...rest } = body

  if (media_type === 'show') {
    // Upsert watched_shows
    const { error } = await supabase.from('watched_shows').upsert({
      user_id: user.id,
      ...rest,
    }, { onConflict: 'user_id,tmdb_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase.from('watched_movies').insert({
      user_id: user.id,
      ...rest,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Remove from queue
    if (rest.tmdb_id) {
      await supabase.from('queue_items')
        .delete()
        .eq('user_id', user.id)
        .eq('tmdb_id', rest.tmdb_id)
        .eq('media_type', 'movie')
    }
  }

  return NextResponse.json({ ok: true })
}
