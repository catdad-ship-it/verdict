export { posterUrl } from './tmdb'
export { calcFinishTime, formatRuntime } from './finishTime'

export function genreLabel(ids: number[]): string {
  const { TMDB_GENRES } = require('./types')
  return ids.slice(0, 2).map((id: number) => TMDB_GENRES[id]).filter(Boolean).join(' / ')
}

// "2h ago" / "3d ago" / "Just now" — used by the Home activity feed.
export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1)   return 'Just now'
  if (minutes < 60)  return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)    return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7)      return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5)     return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return months < 1 ? '1mo ago' : `${months}mo ago`
}

export class ApiError extends Error {
  status: number
  constructor(status: number) {
    super(`Request failed with status ${status}`)
    this.status = status
  }
}

// Thin wrapper around fetch that throws on a non-2xx response instead of
// letting callers treat an error page/body as success data.
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init)
  if (!res.ok) throw new ApiError(res.status)
  return res
}

export interface ProviderData {
  providers: { providerId: number; providerName: string; logoPath: string }[]
  ownedProviders: { providerId: number; providerName: string; logoPath: string }[]
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
