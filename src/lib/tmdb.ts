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

export async function discoverMovies(genreIds: number[], excludeIds: number[], excludeGenreIds: number[] = []): Promise<Movie[]> {
  const params = {
    with_genres: genreIds.slice(0, 3).join('|'),
    sort_by: 'vote_average.desc',
    'vote_count.gte': '200',
    // No documentaries by default, plus whatever genres the user has explicitly hidden in Settings
    without_genres: [99, ...excludeGenreIds].join('|'),
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

export interface CreditInfo { id: number; name: string; role: 'director' | 'cast' }

// Director + top-billed cast for a movie — used to build the "more from this
// director/actor" suggestion signal without persisting any new profile data.
export async function getMovieCredits(tmdbId: number): Promise<CreditInfo[]> {
  const data = await get(`/movie/${tmdbId}/credits`)
  const crew: TMDBCrewMember[] = data.crew ?? []
  const cast: TMDBCastMember[] = data.cast ?? []
  const directors: CreditInfo[] = crew
    .filter(c => c.job === 'Director')
    .map(c => ({ id: c.id, name: c.name, role: 'director' as const }))
  const topCast: CreditInfo[] = cast
    .slice(0, 5)
    .map(c => ({ id: c.id, name: c.name, role: 'cast' as const }))
  return [...directors, ...topCast]
}

// Other movies featuring a given person (actor or director) — one extra
// candidate pool alongside genre-based discover/recommendations.
export async function discoverMoviesByPerson(personId: number, excludeIds: number[]): Promise<Movie[]> {
  const data = await get('/discover/movie', {
    with_people: String(personId),
    sort_by: 'popularity.desc',
    'vote_count.gte': '50',
  })
  const excludeSet = new Set(excludeIds)
  const results: TMDBMovieResult[] = data.results ?? []
  return results
    .filter(d => !excludeSet.has(d.id))
    .slice(0, 8)
    .map(d => ({
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

// ── People ─────────────────────────────────────────────
export interface PersonResult {
  id: number
  name: string
  profilePath: string | null
  knownForDepartment: string | null
  knownFor: string[]  // up to 3 title/name strings, for a hint under the result
}

export async function searchPeople(query: string): Promise<PersonResult[]> {
  const data = await get('/search/person', { query, include_adult: 'false' })
  const results: TMDBPersonSearchResult[] = data.results ?? []
  return results.slice(0, 8).map(d => ({
    id: d.id,
    name: d.name,
    profilePath: d.profile_path,
    knownForDepartment: d.known_for_department ?? null,
    knownFor: (d.known_for ?? [])
      .map(k => k.title ?? k.name)
      .filter((t): t is string => Boolean(t))
      .slice(0, 3),
  }))
}

export interface PersonCreditItem {
  id: number
  title: string
  posterPath: string | null
  releaseYear: number | null
  genreIds: number[]
  mediaType: 'movie' | 'show'
  role: string        // job (director/writer/...) or character name
  popularity: number
}

// A person's full filmography (movies + TV, cast + crew combined) for the
// search modal's drill-down view. Same-title cast+crew entries (e.g. an
// actor-director) are merged into one row with both roles listed.
export async function getPersonCredits(personId: number): Promise<PersonCreditItem[]> {
  const data = await get(`/person/${personId}/combined_credits`)
  const cast: TMDBPersonCastCredit[] = data.cast ?? []
  const crew: TMDBPersonCrewCredit[] = data.crew ?? []

  const merged = new Map<string, PersonCreditItem>()
  const upsert = (raw: TMDBPersonCastCredit | TMDBPersonCrewCredit, role: string) => {
    if (raw.media_type !== 'movie' && raw.media_type !== 'tv') return
    const mediaType: 'movie' | 'show' = raw.media_type === 'tv' ? 'show' : 'movie'
    const key = `${mediaType}:${raw.id}`
    const dateStr = raw.release_date || raw.first_air_date
    const existing = merged.get(key)
    if (existing) {
      if (!existing.role.includes(role)) existing.role = `${existing.role}, ${role}`
      return
    }
    merged.set(key, {
      id: raw.id,
      title: raw.title ?? raw.name ?? 'Untitled',
      posterPath: raw.poster_path,
      releaseYear: dateStr ? parseInt(dateStr) : null,
      genreIds: raw.genre_ids ?? [],
      mediaType,
      role,
      popularity: raw.popularity ?? 0,
    })
  }

  for (const c of cast) upsert(c, c.character || 'Actor')
  for (const c of crew) upsert(c, c.job || 'Crew')

  return [...merged.values()].sort((a, b) => b.popularity - a.popularity)
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

interface TMDBCastMember { id: number; name: string }
interface TMDBCrewMember { id: number; name: string; job: string }

interface TMDBPersonSearchResult {
  id: number
  name: string
  profile_path: string | null
  known_for_department?: string
  known_for?: { title?: string; name?: string }[]
}

interface TMDBPersonCastCredit {
  id: number
  media_type: string
  title?: string
  name?: string
  poster_path: string | null
  release_date?: string
  first_air_date?: string
  genre_ids?: number[]
  character?: string
  popularity?: number
}

interface TMDBPersonCrewCredit {
  id: number
  media_type: string
  title?: string
  name?: string
  poster_path: string | null
  release_date?: string
  first_air_date?: string
  genre_ids?: number[]
  job?: string
  popularity?: number
}
