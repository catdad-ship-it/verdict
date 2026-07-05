export interface RedditPost {
  title: string
  score: number
  url: string
  permalink: string
  selftext: string
  numComments: number
}

export interface TrendingMovie {
  extractedTitle: string
  score: number
  comments: number
  redditUrl: string
}

const MOVIE_SUBS = ['movies', 'flicks', 'TrueFilm']
const SHOW_SUBS  = ['television', 'tvshows']

async function fetchSubreddit(sub: string, sort: 'hot' | 'top' = 'hot'): Promise<RedditPost[]> {
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${sub}/${sort}.json?limit=25`,
      {
        headers: { 'User-Agent': 'verdict-app/1.0' },
        next: { revalidate: 1800 },
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.data?.children?.map((c: { data: RedditPost }) => c.data) ?? []
  } catch {
    return []
  }
}

// Extract likely movie title from a Reddit post title
function extractTitle(postTitle: string): string | null {
  // Common patterns: "Movie Name (YEAR)" or "[DISCUSSION] Movie Name" etc.
  const yearMatch = postTitle.match(/^(.+?)\s*\(\d{4}\)/)
  if (yearMatch) return yearMatch[1].replace(/^\[.*?\]\s*/, '').trim()

  // Strip common prefixes
  const cleaned = postTitle
    .replace(/^\[.*?\]\s*/g, '')
    .replace(/^(Review|Discussion|Recommendation|Watched|Just saw|Official Trailer)[:–\-\s]*/i, '')
    .split(/[–\-:|]/)[0]
    .trim()

  return cleaned.length > 2 && cleaned.length < 80 ? cleaned : null
}

export async function getTrendingMovies(): Promise<TrendingMovie[]> {
  const posts = (await Promise.all(MOVIE_SUBS.map(s => fetchSubreddit(s)))).flat()
  return posts
    .filter(p => p.score > 100)
    .map(p => {
      const title = extractTitle(p.title)
      if (!title) return null
      return {
        extractedTitle: title,
        score: p.score,
        comments: p.numComments,
        redditUrl: `https://reddit.com${p.permalink}`,
      }
    })
    .filter((x): x is TrendingMovie => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
}

export async function getTrendingShows(): Promise<TrendingMovie[]> {
  const posts = (await Promise.all(SHOW_SUBS.map(s => fetchSubreddit(s)))).flat()
  return posts
    .filter(p => p.score > 100)
    .map(p => {
      const title = extractTitle(p.title)
      if (!title) return null
      return {
        extractedTitle: title,
        score: p.score,
        comments: p.numComments,
        redditUrl: `https://reddit.com${p.permalink}`,
      }
    })
    .filter((x): x is TrendingMovie => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
}
