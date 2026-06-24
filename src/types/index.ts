export type MediaType = 'movie' | 'tv'

export interface TMDBMovie {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  genre_ids: number[]
  vote_average: number
  runtime?: number
}

export interface TMDBShow {
  id: number
  name: string
  overview: string
  poster_path: string | null
  first_air_date: string
  genre_ids: number[]
  vote_average: number
  number_of_seasons?: number
  episode_run_time?: number[]
}

export interface Ratings {
  imdb: string | null
  rottenTomatoes: string | null
}

export interface QueueItem {
  id: string
  tmdb_id: number
  media_type: MediaType
  title: string
  poster_path: string | null
  genre_ids: number[]
  runtime: number | null
  release_year: number | null
  added_at: string
}

export interface WatchedItem {
  id: string
  tmdb_id: number
  media_type: MediaType
  title: string
  poster_path: string | null
  genre_ids: number[]
  runtime: number | null
  release_year: number | null
  season_number: number | null
  watched_at: string
  rating: number | null
  liked_aspects: string[] | null
  want_more: boolean | null
}

export interface WatchingShow {
  id: string
  tmdb_id: number
  title: string
  poster_path: string | null
  current_season: number
  total_seasons: number | null
  started_at: string
}

export interface RedditPost {
  title: string
  url: string
  score: number
  num_comments: number
  tmdb_id?: number
  movie_title?: string
  poster_path?: string
}

export interface PostWatchAnswers {
  rating: number
  liked_aspects: string[]
  want_more: boolean
  season_number?: number
}
