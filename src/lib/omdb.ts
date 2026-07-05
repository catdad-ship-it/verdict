interface OMDBRatings {
  imdbRating: number | null
  rtScore: number | null
}

// Bounded, TTL'd cache — a bare Map here would grow forever on a
// long-lived Fly instance. Negative lookups (unknown titles) are cached
// too, since New Releases does up to ~40 OMDB lookups/request against a
// 1,000/day free tier and unmatched titles were being re-looked-up every
// single time.
const TTL_MS = 24 * 60 * 60 * 1000
const MAX_SIZE = 2000
const cache = new Map<string, { value: OMDBRatings; expiresAt: number }>()

function cacheGet(key: string): OMDBRatings | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (entry.expiresAt < Date.now()) { cache.delete(key); return undefined }
  return entry.value
}

function cacheSet(key: string, value: OMDBRatings) {
  if (cache.size >= MAX_SIZE) {
    const oldestKey = cache.keys().next().value
    if (oldestKey !== undefined) cache.delete(oldestKey)
  }
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS })
}

export async function getRatings(title: string, year?: number): Promise<OMDBRatings> {
  const key = `${title}-${year}`
  const cached = cacheGet(key)
  if (cached) return cached

  try {
    const params = new URLSearchParams({
      apikey: process.env.OMDB_API_KEY!,
      t: title,
      ...(year ? { y: String(year) } : {}),
    })
    const res = await fetch(`https://www.omdbapi.com/?${params}`, {
      next: { revalidate: 86400 },
    })
    const data = await res.json()
    if (data.Response === 'False') {
      const result = { imdbRating: null, rtScore: null }
      cacheSet(key, result)
      return result
    }

    const imdb = data.imdbRating !== 'N/A' ? parseFloat(data.imdbRating) : null
    const rtRaw = data.Ratings?.find((r: { Source: string; Value: string }) =>
      r.Source === 'Rotten Tomatoes'
    )?.Value
    const rt = rtRaw ? parseInt(rtRaw) : null

    const result = { imdbRating: imdb, rtScore: rt }
    cacheSet(key, result)
    return result
  } catch {
    return { imdbRating: null, rtScore: null }
  }
}
