import { Movie, Show, TMDB_GENRES } from './types'

const BASE_URL = 'https://api.themoviedb.org/3'
const IMG_BASE = 'https://image.tmdb.org/t/p'
const KEY = process.env.TMDB_API_KEY

export function posterUrl(path: string | null, size: 'w342' | 'w500' | 'original' = 'w342') {
  return path ? `${IMG_BASE}/${size}${path}` : null
}

async function get(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE_URL}${path}`)
  url.searchParams.set('api_key', KEY ?? '')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`)
  return res.json()
}

function genreNames(ids: number[]): string[] {
  return ids.map(id => TMDB_GENRES[id]).filter(Boolean)
}

// ── Movie ──────────────────────────────────────────────
export async function getMovie(tmdbId: number): Promise<Movie & { tmdbRating: number | null }> {
  const d = await get(`/movie/${tmdbId}`)
  return {
    id: d.id,
    title: d.title,
    posterPath: d.poster_path,
    backdropPath: d.backdrop_path,
    overview: d.overview,
    releaseYear: d.release_date ? parseInt(d.release_date) : 0,
    runtime: d.runtime || null,
    genreIds: d.genres?.map((g: { id: number }) => g.id) ?? [],
    genres: d.genres?.map((g: { name: string }) => g.name) ?? [],
    imdbRating: null,
    rtScore: null,
    mediaType: 'movie',
    // TMDB community score — used as fallback when OMDB has no data yet
    tmdbRating: d.vote_average ? Math.round(d.vote_average * 10) / 10 : null,
  }
}

export async function searchMovies(query: string): Promise<Movie[]> {
  const data = await get('/search/movie', { query, include_adult: 'false' })
  return data.results.slice(0, 10).map((d: TMDBMovieResult) => ({
    id: d.id,
    title: d.title,
    posterPath: d.poster_path,
    backdropPath: d.backdrop_path,
    overview: d.overview,
    releaseYear: d.release_date ? parseInt(d.release_date) : 0,
    runtime: null,
    genreIds: d.genre_ids ?? [],
    genres: genreNames(d.genre_ids ?? []),
    imdbRating: null,
    rtScore: null,
    mediaType: 'movie' as const,
  }))
}

export async function getNowPlaying(): Promise<Movie[]> {
  const [p1, p2] = await Promise.all([
    get('/movie/now_playing', { region: 'US', page: '1' }),
    get('/movie/now_playing', { region: 'US', page: '2' }),
  ])
  const results: TMDBMovieResult[] = [...(p1.results ?? []), ...(p2.results ?? [])]
  return results.slice(0, 40).map((d: TMDBMovieResult) => ({
    id: d.id,
    title: d.title,
    posterPath: d.poster_path,
    backdropPath: d.backdrop_path,
    overview: d.overview,
    releaseYear: d.release_date ? parseInt(d.release_date) : 0,
    runtime: null,
    genreIds: d.genre_ids ?? [],
    genres: genreNames(d.genre_ids ?? []),
    imdbRating: d.vote_average ? Math.round(d.vote_average * 10) / 10 : null,
    rtScore: null,
    mediaType: 'movie' as const,
  }))
}

export async function getUpcoming(): Promise<Movie[]> {
  const [p1, p2] = await Promise.all([
    get('/movie/upcoming', { region: 'US', page: '1' }),
    get('/movie/upcoming', { region: 'US', page: '2' }),
  ])
  const results: TMDBMovieResult[] = [...(p1.results ?? []), ...(p2.results ?? [])]
  return results.slice(0, 40).map((d: TMDBMovieResult) => ({
    id: d.id,
    title: d.title,
    posterPath: d.poster_path,
    backdropPath: null,
    overview: d.overview,
    releaseYear: d.release_date ? parseInt(d.release_date) : 0,
    runtime: null,
    genreIds: d.genre_ids ?? [],
    genres: genreNames(d.genre_ids ?? []),
    imdbRating: null,
    rtScore: null,
    mediaType: 'movie' as const,
  }))
}


export async function getNewToStreaming(): Promise<Movie[]> {
  // Movies released in the last 120 days now available on major streaming platforms
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 120)
  const dateStr = cutoff.toISOString().split('T')[0]

  const data = await get('/discover/movie', {
    watch_region: 'US',
    with_watch_monetization_types: 'flatrate',
    // Netflix=8, Prime=9, Disney+=337, Hulu=15, Max=1899, Peacock=386, Paramount+=531
    with_watch_providers: '8|9|337|15|1899|386|531',
    'primary_release_date.gte': dateStr,
    sort_by: 'popularity.desc',
    'vote_count.gte': '20',
  })
  const [p2, p3] = await Promise.all([
    get('/discover/movie', {
      watch_region: 'US', with_watch_monetization_types: 'flatrate',
      with_watch_providers: '8|9|337|15|1899|386|531',
      'primary_release_date.gte': dateStr,
      sort_by: 'popularity.desc', 'vote_count.gte': '20', page: '2',
    }),
    get('/discover/movie', {
      watch_region: 'US', with_watch_monetization_types: 'flatrate',
      with_watch_providers: '8|9|337|15|1899|386|531',
      'primary_release_date.gte': dateStr,
      sort_by: 'popularity.desc', 'vote_count.gte': '20', page: '3',
    }),
  ])
  const allResults: TMDBMovieResult[] = [
    ...(data.results ?? []), ...(p2.results ?? []), ...(p3.results ?? []),
  ]
  return allResults.slice(0, 60).map((d: TMDBMovieResult) => ({
    id: d.id,
    title: d.title,
    posterPath: d.poster_path,
    backdropPath: null,
    overview: d.overview,
    releaseYear: d.release_date ? parseInt(d.release_date) : 0,
    runtime: null,
    genreIds: d.genre_ids ?? [],
    genres: genreNames(d.genre_ids ?? []),
    imdbRating: d.vote_average ? Math.round(d.vote_average * 10) / 10 : null,
    rtScore: null,
    mediaType: 'movie' as const,
  }))
}

export async function getMovieRecommendations(tmdbId: number): Promise<Movie[]> {
  const data = await get(`/movie/${tmdbId}/recommendations`)
  return data.results.slice(0, 10).map((d: TMDBMovieResult) => ({
    id: d.id,
    title: d.title,
    posterPath: d.poster_path,
    backdropPath: null,
    overview: d.overview,
    releaseYear: d.release_date ? parseInt(d.release_date) : 0,
    runtime: null,
    genreIds: d.genre_ids ?? [],
    genres: genreNames(d.genre_ids ?? []),
    imdbRating: d.vote_average ? Math.round(d.vote_average * 10) / 10 : null,
    rtScore: null,
    mediaType: 'movie' as const,
  }))
}

export async function discoverMovies(genreIds: number[], excludeIds: number[]): Promise<Movie[]> {
  const params = {
    with_genres: genreIds.slice(0, 3).join('|'),
    sort_by: 'vote_average.desc',
    'vote_count.gte': '200',
    without_genres: '99',  // no documentaries in suggestions
  }
  // Fetch 3 pages in parallel so we have a deep pool to draw from
  const [p1, p2, p3] = await Promise.all([
    get('/discover/movie', { ...params, page: '1' }),
    get('/discover/movie', { ...params, page: '2' }),
    get('/discover/movie', { ...params, page: '3' }),
  ])
  const combined: TMDBMovieResult[] = [
    ...p1.results, ...p2.results, ...p3.results,
  ]
  const excludeSet = new Set(excludeIds)
  return combined
    .filter((d: TMDBMovieResult) => !excludeSet.has(d.id))
    .slice(0, 60)
    .map((d: TMDBMovieResult) => ({
      id: d.id,
      title: d.title,
      posterPath: d.poster_path,
      backdropPath: null,
      overview: d.overview,
      releaseYear: d.release_date ? parseInt(d.release_date) : 0,
      runtime: null,
      genreIds: d.genre_ids ?? [],
      genres: genreNames(d.genre_ids ?? []),
      imdbRating: d.vote_average ? Math.round(d.vote_average * 10) / 10 : null,
      rtScore: null,
      mediaType: 'movie' as const,
    }))
}

// ── Show ──────────────────────────────────────────────
export async function getShow(tmdbId: number): Promise<Show> {
  const d = await get(`/tv/${tmdbId}`)
  return {
    id: d.id,
    title: d.name,
    posterPath: d.poster_path,
    backdropPath: d.backdrop_path,
    overview: d.overview,
    firstAirYear: d.first_air_date ? parseInt(d.first_air_date) : 0,
    episodeRuntime: d.episode_run_time?.[0] || null,
    genreIds: d.genres?.map((g: { id: number }) => g.id) ?? [],
    genres: d.genres?.map((g: { name: string }) => g.name) ?? [],
    imdbRating: null,
    rtScore: null,
    totalSeasons: d.number_of_seasons ?? 1,
    mediaType: 'tv',
  }
}

export async function searchShows(query: string): Promise<Show[]> {
  const data = await get('/search/tv', { query, include_adult: 'false' })
  return data.results.slice(0, 10).map((d: TMDBShowResult) => ({
    id: d.id,
    title: d.name,
    posterPath: d.poster_path,
    backdropPath: d.backdrop_path,
    overview: d.overview,
    firstAirYear: d.first_air_date ? parseInt(d.first_air_date) : 0,
    episodeRuntime: null,
    genreIds: d.genre_ids ?? [],
    genres: genreNames(d.genre_ids ?? []),
    imdbRating: null,
    rtScore: null,
    totalSeasons: 1,
    mediaType: 'tv' as const,
  }))
}

// ── Internal types ─────────────────────────────────────
interface TMDBMovieResult {
  id: number
  title: string
  poster_path: string | null
  backdrop_path: string | null
  overview: string
  release_date: string
  genre_ids: number[]
  vote_average: number
}

interface TMDBShowResult {
  id: number
  name: string
  poster_path: string | null
  backdrop_path: string | null
  overview: string
  first_air_date: string
  genre_ids: number[]
  vote_average: number
}
