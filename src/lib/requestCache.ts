// Dedupes identical fetches within one page load — e.g. reopening the same
// TitleDetailModal shouldn't refire its detail/logo/content-warnings
// requests. In-memory only (no persistence, no TTL): a fresh page load
// clears it naturally, and none of this data changes mid-session.
const cache = new Map<string, Promise<unknown>>()

export function cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = cache.get(key)
  if (cached) return cached as Promise<T>
  // Don't cache a failure — let the next call retry instead of being
  // stuck with a rejected promise for the rest of the session.
  const promise = fetcher().catch((err: unknown) => { cache.delete(key); throw err })
  cache.set(key, promise)
  return promise
}
