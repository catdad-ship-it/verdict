import { discoverMovies, getMovieRecommendations } from './tmdb'
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
  dislikedTmdbIds: [],
}

interface SuggestionOptions {
  lovedGenreIds: number[]
  watchedIds: number[]
  queueIds: number[]
  dismissedIds?: number[]
  topRatedMovieIds?: number[]   // movies rated 4-5 stars — used for TMDB recommendations
}

export async function getMovieSuggestions(opts: SuggestionOptions): Promise<Movie[]> {
  const excludeSet = new Set([
    ...opts.watchedIds,
    ...opts.queueIds,
    ...SEED_PROFILE.lovedTmdbIds,
    ...(opts.dismissedIds ?? []),
  ])

  const genreIds = opts.lovedGenreIds.length > 0
    ? opts.lovedGenreIds
    : SEED_PROFILE.topGenreIds

  // Fetch Discover results + TMDB recommendations from top-rated movies in parallel
  const topRatedIds = (opts.topRatedMovieIds ?? []).slice(0, 5) // cap at 5 API calls
  const [discoverResults, ...recArrays] = await Promise.all([
    discoverMovies(genreIds, [...excludeSet]),
    ...topRatedIds.map(id => getMovieRecommendations(id).catch(() => [] as Movie[])),
  ])

  // Merge discover + recommendations, deduplicate, filter exclusions
  const seen = new Set<number>()
  const merged: Movie[] = []
  for (const m of [...discoverResults, ...recArrays.flat()]) {
    if (!excludeSet.has(m.id) && !seen.has(m.id)) {
      seen.add(m.id)
      merged.push(m)
    }
  }

  return merged.slice(0, 60)
}

// Derive genre preferences from watched movies, queue items, and watched shows
export function deriveGenrePreferences(
  watchedMovies: { genreIds: number[]; userRating: number | null; wantMoreLikeThis?: boolean | null }[],
  queueItems:    { genreIds: number[] }[],
  watchedShows:  { genreIds: number[] }[],
): number[] {
  const scores: Record<number, number> = {}

  // Watched + rated movies: strong signal
  // loved + want more (4-5) = +2, loved + switch it up = +0.5
  // liked + want more (3) = +1, liked + switch it up = 0
  // disliked (1-2) = -1 regardless
  for (const m of watchedMovies) {
    if (!m.userRating) continue
    let weight: number
    if (m.userRating >= 4) {
      weight = m.wantMoreLikeThis === false ? 0.5 : 2
    } else if (m.userRating === 3) {
      weight = m.wantMoreLikeThis === false ? 0 : 1
    } else {
      weight = -1
    }
    for (const gId of m.genreIds) {
      scores[gId] = (scores[gId] ?? 0) + weight
    }
  }

  // Queue items: intent signal, lighter weight
  for (const q of queueItems) {
    for (const gId of q.genreIds) {
      scores[gId] = (scores[gId] ?? 0) + 0.5
    }
  }

  // Watched shows: completion signal, flat +1
  for (const s of watchedShows) {
    for (const gId of s.genreIds) {
      scores[gId] = (scores[gId] ?? 0) + 1
    }
  }

  return Object.entries(scores)
    .filter(([, score]) => score > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([id]) => parseInt(id))
}
