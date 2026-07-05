import { getMovie, getShow } from '@/lib/tmdb'
import { getRatings } from '@/lib/omdb'

export interface EnrichedTitle {
  runtime: number | null
  releaseYear: number | null
  imdbRating: number | null
  rtScore: number | null
}

interface ExistingTitleData {
  releaseYear?: number | null
  imdbRating?: number | null
  rtScore?: number | null
}

// Shared "TMDB detail → runtime/releaseYear → OMDB ratings fallback" block,
// previously triplicated (with drift) across queue/route.ts and
// lists/[id]/items/route.ts. Canonical semantics: for movies, prefer
// OMDB's imdbRating but fall back to TMDB's community score when OMDB has
// no data yet (e.g. very new releases); shows never get an imdbRating here.
// Never throws — on any upstream failure, returns `existing` with runtime
// null so callers can proceed gracefully.
export async function enrichTitle(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  existing: ExistingTitleData = {}
): Promise<EnrichedTitle> {
  let runtime: number | null = null
  let releaseYear = existing.releaseYear ?? null
  let imdbRating = existing.imdbRating ?? null
  let rtScore = existing.rtScore ?? null

  try {
    if (mediaType === 'tv') {
      const detail = await getShow(tmdbId)
      runtime = detail.episodeRuntime ?? null
      releaseYear = releaseYear ?? detail.firstAirYear ?? null
    } else {
      const detail = await getMovie(tmdbId)
      runtime = detail.runtime ?? null
      releaseYear = releaseYear ?? detail.releaseYear ?? null
      if (!imdbRating && detail.title) {
        const r = await getRatings(detail.title, detail.releaseYear)
        imdbRating = r.imdbRating ?? detail.tmdbRating ?? null
        rtScore = r.rtScore ?? null
      }
    }
  } catch {
    // Non-fatal — proceed with whatever we had (or nulls)
  }

  return { runtime, releaseYear, imdbRating, rtScore }
}
