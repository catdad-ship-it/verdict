export { posterUrl } from './tmdb'
export { calcFinishTime, formatRuntime } from './finishTime'

export function genreLabel(ids: number[]): string {
  const { TMDB_GENRES } = require('./types')
  return ids.slice(0, 2).map((id: number) => TMDB_GENRES[id]).filter(Boolean).join(' / ')
}

export interface ProviderData {
  providers: { providerId: number; providerName: string; logoPath: string }[]
  hasRent: boolean
  hasBuy: boolean
}

// Fetch streaming-provider data for a whole screen of cards in one request
// instead of letting every VHSCard hit /api/providers on its own — keyed
// the same way the batch route returns it: `${mediaType}:${tmdbId}`.
export async function fetchProvidersBatch(
  items: { tmdbId: number; mediaType: 'movie' | 'tv' }[]
): Promise<Record<string, ProviderData>> {
  if (items.length === 0) return {}
  try {
    const res = await fetch('/api/providers/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    const data = await res.json()
    return data.results ?? {}
  } catch {
    return {}
  }
}
