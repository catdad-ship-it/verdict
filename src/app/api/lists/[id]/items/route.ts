import { createClient } from '@/lib/supabase/server'
import { enrichTitle } from '@/lib/enrich'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/lists/[id]/items
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('list_items')
    .select('*')
    .eq('list_id', id)
    .eq('user_id', user.id)
    .order('added_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/lists/[id]/items  → add an item to a list
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: list_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify the list belongs to this user before touching it
  const { data: listCheck } = await supabase.from('lists').select('id').eq('id', list_id).eq('user_id', user.id).single()
  if (!listCheck) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const tmdb_id    = body.tmdbId    ?? body.tmdb_id
  const raw_type   = body.mediaType ?? body.media_type ?? 'movie'
  const media_type = (raw_type === 'tv' || raw_type === 'show') ? 'tv' : 'movie'
  const { title, posterPath, poster_path, genreIds, genre_ids, overview } = body

  let runtime     = body.runtime     ?? null
  let releaseYear = body.releaseYear ?? body.release_year ?? null
  let imdbRating  = body.imdbRating  ?? body.imdb_rating  ?? null
  let rtScore     = body.rtScore     ?? body.rt_score     ?? null

  // Enrich from TMDB if runtime missing
  if (!runtime && tmdb_id) {
    const enriched = await enrichTitle(tmdb_id, media_type, { releaseYear, imdbRating, rtScore })
    runtime     = enriched.runtime
    releaseYear = enriched.releaseYear
    imdbRating  = enriched.imdbRating
    rtScore     = enriched.rtScore
  }

  const { error } = await supabase.from('list_items').upsert({
    list_id,
    user_id:      user.id,
    tmdb_id,
    media_type,
    title,
    poster_path:  poster_path ?? posterPath ?? null,
    genre_ids:    genre_ids   ?? genreIds   ?? [],
    runtime,
    release_year: releaseYear,
    imdb_rating:  imdbRating,
    rt_score:     rtScore,
    overview:     overview ?? null,
  }, { onConflict: 'list_id,tmdb_id,media_type' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/lists/[id]/items  → remove an item from a list
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: list_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tmdbId, mediaType } = await req.json()
  const media_type = (mediaType === 'tv' || mediaType === 'show') ? 'tv' : 'movie'

  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('list_id', list_id)
    .eq('user_id', user.id)
    .eq('tmdb_id', tmdbId)
    .eq('media_type', media_type)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
