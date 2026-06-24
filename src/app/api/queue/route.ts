import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

function toQueueItem(row: any) {
  return {
    id:          row.id,
    tmdbId:      row.tmdb_id,
    mediaType:   row.media_type === 'show' ? 'tv' : 'movie',
    title:       row.title,
    posterPath:  row.poster_path,
    genreIds:    row.genre_ids ?? [],
    runtime:     row.runtime ?? null,
    releaseYear: row.release_year ?? null,
    imdbRating:  row.imdb_rating ?? null,
    rtScore:     row.rt_score ?? null,
    addedAt:     row.added_at,
    overview:    row.overview ?? null,
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('queue_items')
    .select('*')
    .eq('user_id', user.id)
    .order('added_at', { ascending: false })

  return NextResponse.json((data ?? []).map(toQueueItem))
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  // Accept either camelCase or snake_case from callers
  const tmdb_id    = body.tmdb_id    ?? body.tmdbId
  const media_type = body.media_type ?? (body.mediaType === 'tv' ? 'show' : body.mediaType) ?? 'movie'
  const { title, poster_path, posterPath, genre_ids, genreIds, runtime, overview } = body

  const { error } = await supabase.from('queue_items').upsert({
    user_id: user.id,
    tmdb_id,
    media_type,
    title,
    poster_path: poster_path ?? posterPath,
    genre_ids:   genre_ids   ?? genreIds ?? [],
    runtime,
    overview,
  }, { onConflict: 'user_id,tmdb_id,media_type' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const tmdb_id    = body.tmdb_id    ?? body.tmdbId
  const media_type = body.media_type ?? (body.mediaType === 'tv' ? 'show' : body.mediaType) ?? 'movie'

  const { error } = await supabase
    .from('queue_items')
    .delete()
    .eq('user_id', user.id)
    .eq('tmdb_id', tmdb_id)
    .eq('media_type', media_type)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
