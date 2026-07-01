export type MediaType = 'movie' | 'tv'

export interface Movie {
  id: number
  title: string
  posterPath: string | null
  backdropPath: string | null
  overview: string
  releaseYear: number
  runtime: number | null       // minutes
  genreIds: number[]
  genres: string[]
  imdbRating: number | null
  rtScore: number | null
  mediaType: 'movie'
  // Set when a suggestion came from the cast/crew engine instead of (or in
  // addition to) genre scoring — e.g. "More from Denis Villeneuve". Lets the
  // UI show why a title was picked.
  matchReason?: string
}

export interface Show {
  id: number
  title: string
  posterPath: string | null
  backdropPath: string | null
  overview: string
  firstAirYear: number
  episodeRuntime: number | null  // avg episode minutes
  genreIds: number[]
  genres: string[]
  imdbRating: number | null
  rtScore: number | null
  totalSeasons: number
  mediaType: 'tv'
}

export type MediaItem = Movie | Show

export interface QueueItem {
  id: string
  tmdbId: number
  mediaType: MediaType
  title: string
  posterPath: string | null
  genreIds: number[]
  runtime: number | null
  releaseYear: number | null
  imdbRating: number | null
  rtScore: number | null
  overview?: string | null
  addedAt: string
}

export interface WatchedMovie {
  id: string
  tmdbId: number
  title: string
  posterPath: string | null
  genreIds: number[]
  runtime: number | null
  releaseYear: number
  imdbRating: number | null
  rtScore: number | null
  userRating: number | null
  whatWorked: string[]
  wantMoreLikeThis: boolean
  watchedAt: string
}

export interface WatchedShow {
  id: string
  tmdbId: number
  title: string
  posterPath: string | null
  genreIds: number[]
  status: 'watching' | 'finished' | 'dropped'
  currentSeason: number
  totalSeasons: number
  episodeRuntime: number | null
}

export interface PostWatchAnswers {
  userRating: number
  whatWorked: string[]
  wantMoreLikeThis: boolean
  notes?: string
}

export interface FinishTime {
  endTime: string       // e.g. "11:28 PM"
  duration: string      // e.g. "2h 28m"
  isLate: boolean       // past midnight
}

// TMDB genre map
export const TMDB_GENRES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
  53: 'Thriller', 10752: 'War', 37: 'Western',
  // TV genres
  10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News',
  10764: 'Reality', 10765: 'Sci-Fi & Fantasy', 10766: 'Soap',
  10767: 'Talk', 10768: 'War & Politics',
}

// Movie-only genre ids — Suggestions and New Releases are both movie-only
// today, so genre tuning in Settings should offer these, not the TV ones.
export const MOVIE_GENRE_IDS = [
  28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 10770, 53, 10752, 37,
]

export const WHAT_WORKED_OPTIONS = [
  'The Concept', 'The Cast', 'The Pacing', 'The Ending',
  'Visuals', 'Dialogue', 'Tension', 'The Score', 'The Story',
]
