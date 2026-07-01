// Does The Dog Die — community content-warning data (free tier: search +
// item detail + topicItemStats vote totals; the paid tiers add
// per-instance timestamped "Scene Alerts," which we deliberately don't
// use here). Set DDD_API_KEY in the environment.

const BASE = 'https://www.doesthedogdie.com/api/v3'
const KEY  = process.env.DDD_API_KEY

interface DddSearchResult { id: number; itemTypeName: string; tmdbId?: number }
interface DddTopicItemStat { yesSum: number; noSum: number; topicName: string }
interface DddItemDetail { topicItemStats?: DddTopicItemStat[] }

export interface ContentWarning { topicName: string; yes: number; no: number }

export function dddConfigured(): boolean {
  return !!KEY
}

async function dddGet(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-API-KEY': KEY ?? '' },
    next: { revalidate: 86400 },
  })
  if (!res.ok) throw new Error(`DTDD ${res.status}: ${path}`)
  return res.json()
}

// Minimum combined votes before a topic is worth surfacing — a single
// stray "yes" on an otherwise-unrated title is noise, not a signal.
const MIN_VOTES = 3
const MAX_TOPICS = 6

export async function getContentWarnings(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<ContentWarning[]> {
  if (!KEY) return []
  try {
    const wantType = mediaType === 'tv' ? 'TV Show' : 'Movie'
    const results: DddSearchResult[] = await dddGet(`/items?tmdb=${tmdbId}`)
    if (!results.length) return []
    const match = results.find(r => r.itemTypeName === wantType) ?? results[0]

    const detail: DddItemDetail = await dddGet(`/items/${match.id}`)
    const stats = detail.topicItemStats ?? []

    return stats
      .filter(s => s.yesSum + s.noSum >= MIN_VOTES)
      .map(s => ({ topicName: s.topicName, yes: s.yesSum, no: s.noSum }))
      .sort((a, b) => (b.yes + b.no) - (a.yes + a.no))
      .slice(0, MAX_TOPICS)
  } catch {
    return []
  }
}
