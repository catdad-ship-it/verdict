import { discoverMovies } from './tmdb'
import { Movie } from './types'

// Brady's pre-seeded taste profile
// Genre IDs: 28=Action, 80=Crime, 53=Thriller, 18=Drama, 10752=War, 878=Sci-Fi, 9648=Mystery
export const SEED_PROFILE = {
  topGenreIds: [53, 80, 18, 28, 10752, 878, 9648],  // ordered by strength
  lovedTmdbIds: [
    // War/Action (A-rated)
    530385, // 1917
    46528,  // Black Hawk Down
    857,    // Saving Private Ryan (nearby)
    // Crime/Thriller (A-rated)
    1422,   // The Departed
    949,    // Heat
    9737,   // Collateral
    524434, // Dune 2
    // Drama
    278,    // Shawshank
    792293, // Three Billboards
  ],
  dislikedTmdbIds: [
    // Didn't rate well - nothing to exclude specifically yet
  ],
}

interface SuggestionOptions {
  lovedGenreIds: number[]
  watchedIds: number[]
  queueIds: number[]
}

export async function getMovieSuggestions(opts: SuggestionOptions): Promise<Movie[]> {
  const excludeIds = [...opts.watchedIds, ...opts.queueIds, ...SEED_PROFILE.lovedTmdbIds]
  const genreIds = opts.lovedGenreIds.length > 0
    ? opts.lovedGenreIds
    : SEED_PROFILE.topGenreIds

  const movies = await discoverMovies(genreIds, excludeIds)
  return movies
}

// Derive genre preferences from a user's watched + rated movies
export function deriveGenrePreferences(
  watchedMovies: { genreIds: number[]; userRating: number | null }[]
): number[] {
  const scores: Record<number, number> = {}

  for (const m of watchedMovies) {
    if (!m.userRating) continue
    // Weight: loved (4-5) = +2, liked (3) = +1, disliked (1-2) = -1
    const weight = m.userRating >= 4 ? 2 : m.userRating === 3 ? 1 : -1
    for (const gId of m.genreIds) {
      scores[gId] = (scores[gId] ?? 0) + weight
    }
  }

  return Object.entries(scores)
    .filter(([, score]) => score > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([id]) => parseInt(id))
}
