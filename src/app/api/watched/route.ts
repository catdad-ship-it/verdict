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
  const { media_type, tmdb_id, title, poster_path, genre_ids, runtime,
          user_rating, what_worked, want_more, notes, is_rewatch,
          status, current_season, total_seasons } = body

  if (media_type === 'show') {
    const { error } = await supabase.from('watched_shows').upsert({
      user_id: user.id,
      tmdb_id, title, poster_path, genre_ids, status,
      current_season, total_seasons,
      updated_at: new Date().toISOString(),
      ...(runtime != null ? { episode_runtime: runtime } : {}),
    }, { onConflict: 'user_id,tmdb_id' })
    if (error) {
      console.error('Watched shows insert error:', JSON.stringify(error))
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Remove from queue (only on first watch)
    if (tmdb_id) {
      await supabase.from('queue_items')
        .delete()
        .eq('user_id', user.id)
        .eq('tmdb_id', tmdb_id)
        .eq('media_type', 'tv')
    }
  } else {
    const { error } = await supabase.from('watched_movies').insert({
      user_id: user.id,
      tmdb_id, title, poster_path, genre_ids, runtime,
      user_rating,
      what_worked: what_worked ?? [],
      want_more_like_this: want_more ?? true,
      notes: notes ?? null,
      is_rewatch: is_rewatch ?? false,
    })
    if (error) {
      console.error('Watched movies insert error:', JSON.stringify(error))
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Remove from queue (only on first watch)
    if (tmdb_id && !is_rewatch) {
      await supabase.from('queue_items')
        .delete()
        .eq('user_id', user.id)
        .eq('tmdb_id', tmdb_id)
        .eq('media_type', 'movie')
    }
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/watched — bulk-remove entries from watched history.
// Body: { movieIds?: string[], showIds?: string[] } (watched_movies.id /
// watched_shows.id — pass all rewatch rows for a title to fully clear it).
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { movieIds, showIds } = await req.json()
  const tasks: PromiseLike<{ error: { message: string } | null }>[] = []

  if (Array.isArray(movieIds) && movieIds.length > 0) {
    tasks.push(supabase.from('watched_movies').delete().eq('user_id', user.id).in('id', movieIds))
  }
  if (Array.isArray(showIds) && showIds.length > 0) {
    tasks.push(supabase.from('watched_shows').delete().eq('user_id', user.id).in('id', showIds))
  }
  if (tasks.length === 0) return NextResponse.json({ error: 'No ids provided' }, { status: 400 })

  const results = await Promise.all(tasks)
  const failed = results.find(r => r.error)
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
