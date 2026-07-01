import { getTvdbId } from './tmdb'

// Fanart.tv — clean transparent title logos for the detail modal header,
// instead of just poster art + plain text. Free tier, non-commercial use.
// Set FANART_API_KEY in the environment. Coverage is inconsistent for
// older/obscure titles, so every caller must be ready for a null result
// and fall back to the plain text title.

const BASE = 'https://webservice.fanart.tv/v3'
const KEY  = process.env.FANART_API_KEY

interface FanartLogoEntry { url: string; lang: string; likes: string }
interface FanartMovieResponse { hdmovielogo?: FanartLogoEntry[]; movielogo?: FanartLogoEntry[] }
interface FanartTvResponse { hdtvlogo?: FanartLogoEntry[]; clearlogo?: FanartLogoEntry[] }

// Prefer English art, then whatever has the most likes, then just the first entry.
function pickBest(entries: FanartLogoEntry[] | undefined): string | null {
  if (!entries || entries.length === 0) return null
  const english = entries.filter(e => e.lang === 'en')
  const pool = english.length > 0 ? english : entries
  return [...pool].sort((a, b) => Number(b.likes) - Number(a.likes))[0]?.url ?? null
}

export async function getMovieLogo(tmdbId: number): Promise<string | null> {
  if (!KEY) return null
  try {
    const res = await fetch(`${BASE}/movies/${tmdbId}?api_key=${KEY}`, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    const data: FanartMovieResponse = await res.json()
    return pickBest(data.hdmovielogo) ?? pickBest(data.movielogo)
  } catch {
    return null
  }
}

export async function getShowLogo(tmdbId: number): Promise<string | null> {
  if (!KEY) return null
  try {
    const tvdbId = await getTvdbId(tmdbId)
    if (!tvdbId) return null
    const res = await fetch(`${BASE}/tv/${tvdbId}?api_key=${KEY}`, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    const data: FanartTvResponse = await res.json()
    return pickBest(data.hdtvlogo) ?? pickBest(data.clearlogo)
  } catch {
    return null
  }
}

export async function getTitleLogo(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<string | null> {
  return mediaType === 'tv' ? getShowLogo(tmdbId) : getMovieLogo(tmdbId)
}

export function fanartConfigured(): boolean {
  return !!KEY
}
