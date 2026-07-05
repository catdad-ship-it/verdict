import { createClient } from '@/lib/supabase/server'
import { enrichTitle } from '@/lib/enrich'
import { isFiniteNumber, isNonEmptyString, badRequest } from '@/lib/validate'
import { NextRequest, NextResponse } from 'next/server'

// -1 is a sentinel meaning "we already tried to backfill this and TMDB has
// no runtime data for it" — distinct from null ("never attempted yet") so
// the GET backfill below doesn't re-fetch + re-write the same row forever.
const NO_RUNTIME = -1

interface QueueRow {
  id: string
  tmdb_id: number
  media_type: string
  title: string
  poster_path: string | null
  genre_ids: number[] | null
  runtime: number | null
  release_year: number | null
  imdb_rating: number | null
  rt_score: number | null
  added_at: string
}

function toQueueItem(row: QueueRow) {
  return {
    id:          row.id,
    tmdbId:      row.tmdb_id,
    mediaType:   row.media_type === 'movie' ? 'movie' : 'tv',
    title:       row.title,
    posterPath:  row.poster_path,
    genreIds:    row.genre_ids ?? [],
    runtime:     row.runtime === NO_RUNTIME ? null : (row.runtime ?? null),
    releaseYear: row.release_year ?? null,
    imdbRating:  row.imdb_rating ?? null,
    rtScore:     row.rt_score ?? null,
    addedAt:     row.added_at,
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
    // Manually-dragged rows (sort_order set) come first in that exact order;
    // anything never touched by drag-to-reorder (sort_order null) falls back
    // to newest-added-first.
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('added_at', { ascending: false })

  const rows = data ?? []

  // Backfill runtime AND ratings for items missing either
  const missing = rows.filter(r => r.runtime == null || (r.media_type !== 'tv' && r.imdb_rating == null))
  if (missing.length > 0) {
    await Promise.all(
      missing.map(async row => {
        try {
          const media_type = row.media_type === 'tv' ? 'tv' : 'movie'
          const enriched = await enrichTitle(row.tmdb_id, media_type, {
            releaseYear: row.release_year,
            imdbRating: row.imdb_rating,
            rtScore: row.rt_score,
          })
          // TMDB often has no runtime data for a title — persist the
          // sentinel rather than null so this row stops re-qualifying as
          // "missing" on every subsequent GET.
          const runtime = enriched.runtime ?? NO_RUNTIME
          const releaseYear = enriched.releaseYear
          const imdbRating = enriched.imdbRating
          const rtScore = enriched.rtScore

          // Update the row in DB so we only pay this cost once
          await supabase.from('queue_items').update({
            runtime,
            release_year: releaseYear,
            imdb_rating: imdbRating,
            rt_score: rtScore,
          }).eq('id', row.id)

          // Mutate in-place so this response already has the data
          row.runtime = runtime
          row.release_year = releaseYear
          row.imdb_rating = imdbRating
          row.rt_score = rtScore
        } catch {
          // Non-fatal — leave null
        }
      })
    )
  }

  return NextResponse.json(rows.map(toQueueItem))
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const tmdb_id    = body.tmdb_id    ?? body.tmdbId
  const raw_type   = body.media_type ?? body.mediaType ?? 'movie'
  const media_type = (raw_type === 'tv' || raw_type === 'show') ? 'tv' : 'movie'
  const { title, poster_path, posterPath, genre_ids, genreIds } = body

  if (!isFiniteNumber(tmdb_id)) return badRequest('tmdb_id is required')
  if (!isNonEmptyString(title)) return badRequest('title is required')

  let runtime     = body.runtime     ?? body.runtime     ?? null
  let releaseYear = body.releaseYear ?? body.release_year ?? null
  let imdbRating  = body.imdbRating  ?? body.imdb_rating  ?? null
  let rtScore     = body.rtScore     ?? body.rt_score     ?? null

  // Enrich from TMDB detail if runtime is missing
  if (!runtime && tmdb_id) {
    const enriched = await enrichTitle(tmdb_id, media_type, { releaseYear, imdbRating, rtScore })
    runtime     = enriched.runtime
    releaseYear = enriched.releaseYear
    imdbRating  = enriched.imdbRating
    rtScore     = enriched.rtScore
  }

  const { error } = await supabase.from('queue_items').upsert({
    user_id: user.id,
    tmdb_id,
    media_type,
    title,
    poster_path:  poster_path ?? posterPath,
    genre_ids:    genre_ids   ?? genreIds ?? [],
    runtime,
    release_year: releaseYear,
    imdb_rating:  imdbRating,
    rt_score:     rtScore,
  }, { onConflict: 'user_id,tmdb_id,media_type' })

  if (error) {
    console.error('Queue insert error:', JSON.stringify(error))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const tmdb_id    = body.tmdb_id    ?? body.tmdbId
  const raw_del    = body.media_type ?? body.mediaType ?? 'movie'
  const media_type = (raw_del === 'tv' || raw_del === 'show') ? 'tv' : 'movie'

  if (!isFiniteNumber(tmdb_id)) return badRequest('tmdb_id is required')

  const { error } = await supabase
    .from('queue_items')
    .delete()
    .eq('user_id', user.id)
    .eq('tmdb_id', tmdb_id)
    .eq('media_type', media_type)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
