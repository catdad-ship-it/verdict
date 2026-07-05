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
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) {
    // Surface the real cause server-side (check `fly logs` in prod, or the
    // terminal running `npm run dev` locally) — this was previously a
    // silent catch-all returning [], which made a bad key, a rate limit,
    // or a tier restriction indistinguishable from "no data for this title."
    const body = await res.text().catch(() => '')
    console.error(`[dtdd] ${res.status} on ${path}: ${body.slice(0, 300)}`)
    throw new Error(`DTDD ${res.status}: ${path}`)
  }
  return res.json()
}

// Minimum combined votes before a topic is worth surfacing — a single
// stray "yes" on an otherwise-unrated title is noise, not a signal.
const MIN_VOTES = 3
const MAX_TOPICS = 6

export async function getContentWarnings(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<ContentWarning[]> {
  if (!KEY) {
    console.warn('[dtdd] DDD_API_KEY not set — content warnings disabled')
    return []
  }
  try {
    const wantType = mediaType === 'tv' ? 'TV Show' : 'Movie'
    const results: DddSearchResult[] = await dddGet(`/items?tmdb=${tmdbId}`)
    if (!results.length) {
      console.warn(`[dtdd] no search results for tmdbId=${tmdbId} (${mediaType})`)
      return []
    }
    const match = results.find(r => r.itemTypeName === wantType) ?? results[0]

    const detail: DddItemDetail = await dddGet(`/items/${match.id}`)
    const stats = detail.topicItemStats ?? []
    if (!stats.length) {
      console.warn(`[dtdd] item ${match.id} (tmdbId=${tmdbId}) has no topicItemStats at all`)
    }

    const warnings = stats
      .filter(s => s.yesSum + s.noSum >= MIN_VOTES)
      .map(s => ({ topicName: s.topicName, yes: s.yesSum, no: s.noSum }))
      .sort((a, b) => (b.yes + b.no) - (a.yes + a.no))
      .slice(0, MAX_TOPICS)

    if (stats.length && !warnings.length) {
      console.warn(`[dtdd] item ${match.id} had ${stats.length} topics but none cleared the MIN_VOTES=${MIN_VOTES} threshold`)
    }

    return warnings
  } catch (err) {
    console.error('[dtdd] getContentWarnings failed', { tmdbId, mediaType, err })
    return []
  }
}
