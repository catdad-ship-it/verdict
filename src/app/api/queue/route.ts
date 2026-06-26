import { createClient } from '@/lib/supabase/server'
import { getMovie, getShow } from '@/lib/tmdb'
import { getRatings } from '@/lib/omdb'
import { NextRequest, NextResponse } from 'next/server'

function toQueueItem(row: any) {
  return {
    id:          row.id,
    tmdbId:      row.tmdb_id,
    mediaType:   row.media_type === 'movie' ? 'movie' : 'tv',
    title:       row.title,
    posterPath:  row.poster_path,
    genreIds:    row.genre_ids ?? [],
    runtime:     row.runtime ?? null,
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
    .order('added_at', { ascending: false })

  const rows = data ?? []

  // Backfill runtime AND ratings for items missing either
  const missing = rows.filter(r => r.runtime == null || (r.media_type !== 'tv' && r.imdb_rating == null))
  if (missing.length > 0) {
    await Promise.all(
      missing.map(async row => {
        try {
          const media_type = row.media_type === 'tv' ? 'tv' : 'movie'
          let runtime: number | null = null
          let releaseYear: number | null = row.release_year ?? null
          let imdbRating: number | null = row.imdb_rating ?? null
          let rtScore: number | null = row.rt_score ?? null

          if (media_type === 'tv') {
            const detail = await getShow(row.tmdb_id)
            runtime = detail.episodeRuntime ?? null
            releaseYear = releaseYear ?? detail.firstAirYear ?? null
          } else {
            const detail = await getMovie(row.tmdb_id)
            runtime = detail.runtime ?? null
            releaseYear = releaseYear ?? detail.releaseYear ?? null
            if (!imdbRating && detail.title) {
              const r = await getRatings(detail.title, detail.releaseYear)
              // Prefer IMDb/RT; fall back to TMDB community score for new releases
              imdbRating = r.imdbRating ?? detail.tmdbRating ?? null
              rtScore = r.rtScore ?? null
            }
          }

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

  let runtime     = body.runtime     ?? body.runtime     ?? null
  let releaseYear = body.releaseYear ?? body.release_year ?? null
  let imdbRating  = body.imdbRating  ?? body.imdb_rating  ?? null
  let rtScore     = body.rtScore     ?? body.rt_score     ?? null

  // Enrich from TMDB detail if runtime is missing
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
        // Fetch ratings if missing; fall back to TMDB score for new releases
        if (!imdbRating && detail.title) {
          const r = await getRatings(detail.title, detail.releaseYear)
          imdbRating = r.imdbRating ?? detail.tmdbRating ?? null
          rtScore    = r.rtScore    ?? null
        }
      }
    } catch {
      // Non-fatal — proceed with nulls
    }
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

  const { error } = await supabase
    .from('queue_items')
    .delete()
    .eq('user_id', user.id)
    .eq('tmdb_id', tmdb_id)
    .eq('media_type', media_type)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
