// Trakt.tv trending — replaces the old Reddit-scrape-and-fuzzy-match
// approach (see reddit.ts) with real community activity data and a direct
// TMDB id on every result, no title-guessing regex required.
//
// Free, no OAuth needed for public trending endpoints — just a client_id
// from a self-registered app at https://trakt.tv/oauth/applications.
// Set TRAKT_CLIENT_ID in the environment. If it's unset, callers should
// fall back to the Reddit-based trending (see /api/trending/route.ts).

const BASE = 'https://api.trakt.tv'
const CLIENT_ID = process.env.TRAKT_CLIENT_ID

export interface TraktTrendingItem {
  tmdbId: number
  watchers: number
}

async function traktGet(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'trakt-api-version': '2',
      'trakt-api-key': CLIENT_ID ?? '',
    },
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Trakt ${res.status}: ${path}`)
  return res.json()
}

export function traktConfigured(): boolean {
  return !!CLIENT_ID
}

export async function getTrendingMovies(limit = 10): Promise<TraktTrendingItem[]> {
  const data: { watchers: number; movie: { ids: { tmdb: number | null } } }[] = await traktGet(`/movies/trending?limit=${limit}`)
  return data
    .filter(d => d.movie?.ids?.tmdb)
    .map(d => ({ tmdbId: d.movie.ids.tmdb as number, watchers: d.watchers }))
}

export async function getTrendingShows(limit = 8): Promise<TraktTrendingItem[]> {
  const data: { watchers: number; show: { ids: { tmdb: number | null } } }[] = await traktGet(`/shows/trending?limit=${limit}`)
  return data
    .filter(d => d.show?.ids?.tmdb)
    .map(d => ({ tmdbId: d.show.ids.tmdb as number, watchers: d.watchers }))
}
