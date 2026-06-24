interface OMDBRatings {
  imdbRating: number | null
  rtScore: number | null
}

const cache = new Map<string, OMDBRatings>()

export async function getRatings(title: string, year?: number): Promise<OMDBRatings> {
  const key = `${title}-${year}`
  if (cache.has(key)) return cache.get(key)!

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
    if (data.Response === 'False') return { imdbRating: null, rtScore: null }

    const imdb = data.imdbRating !== 'N/A' ? parseFloat(data.imdbRating) : null
    const rtRaw = data.Ratings?.find((r: { Source: string; Value: string }) =>
      r.Source === 'Rotten Tomatoes'
    )?.Value
    const rt = rtRaw ? parseInt(rtRaw) : null

    const result = { imdbRating: imdb, rtScore: rt }
    cache.set(key, result)
    return result
  } catch {
    return { imdbRating: null, rtScore: null }
  }
}
