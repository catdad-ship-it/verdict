import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deriveGenrePreferences, getMovieSuggestions, SEED_PROFILE } from './suggestions'
import type { Movie } from './types'

vi.mock('./tmdb', () => ({
  discoverMovies: vi.fn(),
  getMovieRecommendations: vi.fn(),
  getMovieCredits: vi.fn(),
  discoverMoviesByPerson: vi.fn(),
}))

import { discoverMovies, getMovieRecommendations } from './tmdb'

function movie(overrides: Partial<Movie> & { id: number }): Movie {
  return {
    title: `Movie ${overrides.id}`,
    posterPath: null,
    backdropPath: null,
    overview: '',
    releaseYear: 2020,
    runtime: 100,
    genreIds: [],
    genres: [],
    imdbRating: null,
    rtScore: null,
    mediaType: 'movie',
    ...overrides,
  }
}

describe('deriveGenrePreferences', () => {
  it('weights a loved, want-more-like-this movie at +2 per genre', () => {
    const scores = deriveGenrePreferences(
      [{ genreIds: [28], userRating: 5, wantMoreLikeThis: true }],
      [], [],
    )
    expect(scores[28]).toBe(2)
  })

  it('discounts a loved movie the user wants to switch away from to +0.5', () => {
    const scores = deriveGenrePreferences(
      [{ genreIds: [28], userRating: 5, wantMoreLikeThis: false }],
      [], [],
    )
    expect(scores[28]).toBe(0.5)
  })

  it('weights a disliked movie at -1 regardless of wantMoreLikeThis', () => {
    const scores = deriveGenrePreferences(
      [{ genreIds: [27], userRating: 1, wantMoreLikeThis: true }],
      [], [],
    )
    expect(scores[27]).toBe(-1)
  })

  it('ignores unrated movies entirely', () => {
    const scores = deriveGenrePreferences(
      [{ genreIds: [28], userRating: null }],
      [], [],
    )
    expect(scores[28]).toBeUndefined()
  })

  it('applies a whatWorked tag boost only for liked movies (rating >= 3)', () => {
    const liked = deriveGenrePreferences(
      [{ genreIds: [], userRating: 4, wantMoreLikeThis: true, whatWorked: ['Tension'] }],
      [], [],
    )
    expect(liked[53]).toBeCloseTo(0.3) // Thriller, from the Tension tag boost
    expect(liked[27]).toBeCloseTo(0.3) // Horror, also boosted by Tension

    const disliked = deriveGenrePreferences(
      [{ genreIds: [], userRating: 2, whatWorked: ['Tension'] }],
      [], [],
    )
    expect(disliked[53]).toBeUndefined()
  })

  it('gives queue items a lighter +0.5 intent signal', () => {
    const scores = deriveGenrePreferences([], [{ genreIds: [18] }], [])
    expect(scores[18]).toBe(0.5)
  })

  it('gives watched shows a flat +1 completion signal', () => {
    const scores = deriveGenrePreferences([], [], [{ genreIds: [18] }])
    expect(scores[18]).toBe(1)
  })

  it('applies a mild -0.3 per dismissed-genre occurrence', () => {
    const scores = deriveGenrePreferences([], [], [], [99, 99])
    expect(scores[99]).toBeCloseTo(-0.6)
  })

  it('combines signals from every source for the same genre', () => {
    const scores = deriveGenrePreferences(
      [{ genreIds: [18], userRating: 5, wantMoreLikeThis: true }],
      [{ genreIds: [18] }],
      [{ genreIds: [18] }],
      [18],
    )
    expect(scores[18]).toBeCloseTo(2 + 0.5 + 1 - 0.3)
  })
})

describe('getMovieSuggestions exclusion logic', () => {
  beforeEach(() => {
    vi.mocked(discoverMovies).mockReset()
    vi.mocked(getMovieRecommendations).mockReset()
  })

  it('excludes already-watched, queued, dismissed, and seed-loved movies from the result', async () => {
    const watchedId = 1
    const queuedId = 2
    const dismissedId = 3
    const seedLovedId = SEED_PROFILE.lovedTmdbIds[0]
    const keptId = 100

    vi.mocked(discoverMovies).mockResolvedValue([
      movie({ id: watchedId, genreIds: [28] }),
      movie({ id: queuedId, genreIds: [28] }),
      movie({ id: dismissedId, genreIds: [28] }),
      movie({ id: seedLovedId, genreIds: [28] }),
      movie({ id: keptId, genreIds: [28] }),
    ])
    vi.mocked(getMovieRecommendations).mockResolvedValue([])

    const result = await getMovieSuggestions({
      genreScores: { 28: 5 },
      watchedIds: [watchedId],
      queueIds: [queuedId],
      dismissedIds: [dismissedId],
    })

    const ids = result.map(m => m.id)
    expect(ids).toEqual([keptId])
  })

  it('excludes movies whose genres are all explicitly hidden', async () => {
    vi.mocked(discoverMovies).mockResolvedValue([
      movie({ id: 10, genreIds: [99] }),  // excluded genre only
      movie({ id: 11, genreIds: [28] }),  // fine
    ])
    vi.mocked(getMovieRecommendations).mockResolvedValue([])

    const result = await getMovieSuggestions({
      genreScores: { 28: 5 },
      watchedIds: [],
      queueIds: [],
      excludeGenreIds: [99],
    })

    expect(result.map(m => m.id)).toEqual([11])
  })

  it('deduplicates a movie that shows up via both discover and recommendations', async () => {
    vi.mocked(discoverMovies).mockResolvedValue([movie({ id: 20, genreIds: [28] })])
    vi.mocked(getMovieRecommendations).mockResolvedValue([movie({ id: 20, genreIds: [28] })])

    const result = await getMovieSuggestions({
      genreScores: { 28: 5 },
      watchedIds: [],
      queueIds: [],
      topRatedMovieIds: [1],
    })

    expect(result.filter(m => m.id === 20)).toHaveLength(1)
  })

  it('merges in cast/crew candidates from the provided promise', async () => {
    vi.mocked(discoverMovies).mockResolvedValue([])
    vi.mocked(getMovieRecommendations).mockResolvedValue([])
    const castCrewMovie = movie({ id: 30, genreIds: [28], matchReason: 'More from Denis Villeneuve' })

    const result = await getMovieSuggestions({
      genreScores: { 28: 5 },
      watchedIds: [],
      queueIds: [],
      castCrewCandidatesPromise: Promise.resolve([castCrewMovie]),
    })

    expect(result.map(m => m.id)).toContain(30)
  })
})
