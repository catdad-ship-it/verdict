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

// Fisher-Yates in-place shuffle
function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Shuffle within score tiers so the same movies don't always appear first
function shuffleWithinTiers<T extends { score: number }>(scored: T[], bucketSize = 8): T[] {
  const result: T[] = []
  for (let i = 0; i < scored.length; i += bucketSize) {
    result.push(...shuffleArray(scored.slice(i, i + bucketSize)))
  }
  return result
}

interface SuggestionOptions {
  genreScores: Record<number, number>
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

  const sortedGenreIds = Object.entries(opts.genreScores).length > 0
    ? Object.entries(opts.genreScores)
        .filter(([, s]) => s > 0)
        .sort(([, a], [, b]) => b - a)
        .map(([id]) => parseInt(id))
    : SEED_PROFILE.topGenreIds

  // Shuffle top-rated seeds so different movies drive recs on each load
  const shuffledTopRated = shuffleArray([...(opts.topRatedMovieIds ?? [])])
  const topRatedIds = shuffledTopRated.slice(0, 5) // cap at 5 API calls

  const [discoverResults, ...recArrays] = await Promise.all([
    discoverMovies(sortedGenreIds, [...excludeSet]),
    ...topRatedIds.map(id => getMovieRecommendations(id).catch(() => [] as Movie[])),
  ])

  // Track which movies came from direct recommendations (stronger signal → small boost)
  const recIdSet = new Set(recArrays.flat().map(m => m.id))

  // Merge discover + recommendations, deduplicate, filter exclusions
  const seen = new Set<number>()
  const merged: Movie[] = []
  for (const m of [...discoverResults, ...recArrays.flat()]) {
    if (!excludeSet.has(m.id) && !seen.has(m.id)) {
      seen.add(m.id)
      merged.push(m)
    }
  }

  // Score each movie, sort best-first, then shuffle within tiers for variety
  const scored = merged
    .map(m => {
      const genreScore = m.genreIds.reduce((sum, gId) => sum + (opts.genreScores[gId] ?? 0), 0)
      const score = recIdSet.has(m.id) ? genreScore * 1.2 : genreScore
      return { m, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 60)

  return shuffleWithinTiers(scored).map(({ m }) => m)
}

// whatWorked tags → TMDB genre ID boosts
// Applied when a liked movie had that tag — amplifies the associated genres
const TAG_GENRE_BOOSTS: Record<string, number[]> = {
  'Tension':     [53, 27],           // Thriller, Horror
  'Visuals':     [878, 28, 12],      // Sci-Fi, Action, Adventure
  'The Concept': [878, 9648, 14],    // Sci-Fi, Mystery, Fantasy
  'The Cast':    [18, 80],           // Drama, Crime
  'The Pacing':  [53, 28],           // Thriller, Action
  'The Ending':  [9648, 53],         // Mystery, Thriller
  'Dialogue':    [18, 80, 35],       // Drama, Crime, Comedy
  'The Score':   [10752, 18, 878],   // War, Drama, Sci-Fi
  'The Story':   [18, 80, 9648],     // Drama, Crime, Mystery
}

// Derive genre preferences from watched movies, queue items, watched shows, and dismissals.
// Returns a score map: genreId → score (higher = stronger preference, negative = disliked).
export function deriveGenrePreferences(
  watchedMovies:      { genreIds: number[]; userRating: number | null; wantMoreLikeThis?: boolean | null; whatWorked?: string[] | null }[],
  queueItems:         { genreIds: number[] }[],
  watchedShows:       { genreIds: number[] }[],
  dismissedGenreIds?: number[],
): Record<number, number> {
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

    // whatWorked tags: secondary genre boost for liked movies (rating >= 3)
    if (m.userRating >= 3 && m.whatWorked?.length) {
      for (const tag of m.whatWorked) {
        const boostIds = TAG_GENRE_BOOSTS[tag] ?? []
        for (const gId of boostIds) {
          scores[gId] = (scores[gId] ?? 0) + 0.3
        }
      }
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

  // Dismissed movies: each genre occurrence is a mild negative signal (-0.3).
  // Signal only accumulates through repeated dismissals of the same genre.
  for (const gId of (dismissedGenreIds ?? [])) {
    scores[gId] = (scores[gId] ?? 0) - 0.3
  }

  return scores
}
