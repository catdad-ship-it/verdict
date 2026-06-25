import { createClient } from '@/lib/supabase/server'
import { getMovie, getShow } from '@/lib/tmdb'
import { getRatings } from '@/lib/omdb'
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
    try {
      if (media_type === 'tv') {
        const detail = await getShow(tmdb_id)
        runtime     = detail.episodeRuntime ?? null
        releaseYear = releaseYear ?? detail.firstAirYear ?? null
      } else {
        const detail = await getMovie(tmdb_id)
        runtime     = detail.runtime ?? null
        releaseYear = releaseYear ?? detail.releaseYear ?? null
        if (!imdbRating && !rtScore && detail.title) {
          const r = await getRatings(detail.title, detail.releaseYear)
          imdbRating = r.imdbRating ?? null
          rtScore    = r.rtScore    ?? null
        }
      }
    } catch { /* non-fatal */ }
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
