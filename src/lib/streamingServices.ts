// Curated set of mainstream US streaming subscriptions users can pick from in
// Settings. `id` is the canonical TMDB watch-provider id we store in
// profiles.streaming_provider_ids. `aliasIds` are OTHER provider_ids TMDB
// uses for the exact same real-world subscription — verified by fetching
// TMDB's live /watch/providers/movie list rather than guessed, since TMDB's
// naming/ids shift over time (Max -> HBO Max, Apple TV+ -> Apple TV,
// Paramount+ losing its old plain id in favor of tier-specific ones, etc).
// `name` is just a fallback label — Settings always shows TMDB's live name.
export interface CuratedService {
  id: number
  name: string
  aliasIds?: number[]
}

export const CURATED_SERVICES: CuratedService[] = [
  { id: 8,    name: 'Netflix',            aliasIds: [1796] },                // Netflix Standard with Ads
  { id: 9,    name: 'Amazon Prime Video', aliasIds: [119, 613, 2100] },      // old dupe, Free/with Ads tiers
  { id: 337,  name: 'Disney+' },
  { id: 15,   name: 'Hulu' },
  { id: 1899, name: 'HBO Max',            aliasIds: [1825] },                // HBO Max Amazon Channel
  { id: 386,  name: 'Peacock',            aliasIds: [387] },                 // Peacock Premium Plus
  { id: 2303, name: 'Paramount+',         aliasIds: [2616] },                // Paramount+ Essential tier
  { id: 350,  name: 'Apple TV' },                                            // Apple renamed "Apple TV+" to "Apple TV" in 2025
  { id: 43,   name: 'Starz' },
  { id: 526,  name: 'AMC+' },
  // Showtime's standalone app was discontinued and folded into Paramount+
  // with Showtime — no longer a distinct subscription to pick.
]

export const CURATED_PROVIDER_IDS = CURATED_SERVICES.map(s => s.id)

// raw TMDB provider_id -> canonical curated id (identity for ids we don't
// otherwise recognize). Used to collapse alias rows before dedupe/matching.
export function buildCanonicalIdMap(): Map<number, number> {
  const map = new Map<number, number>()
  for (const s of CURATED_SERVICES) {
    map.set(s.id, s.id)
    for (const alias of s.aliasIds ?? []) map.set(alias, s.id)
  }
  return map
}

// Fallback for provider rows TMDB adds that aren't in aliasIds yet: compare
// by name with tier/ownership qualifiers stripped, treating "+" and "Plus"
// as equivalent (TMDB and our labels don't always agree on which spelling
// to use for the same brand).
export function normalizeProviderName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\+/g, ' plus ')
    .replace(/\bwith ads\b/g, '')
    .replace(/\bfree\b/g, '')
    .replace(/\bpremium\b/g, '')
    .replace(/\bessential\b/g, '')
    .replace(/\bstandard\b/g, '')
    .replace(/\bbasic\b/g, '')
    .replace(/\bamazon\b/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}

// Canonicalize provider_id via the verified alias map, then dedupe — first
// by canonical id, and as a second safety net by normalized name in case
// TMDB has added yet another variant we haven't listed in aliasIds. Keeps
// whichever row appears first (callers should sort by display_priority
// before calling this).
export function canonicalizeAndDedupe<T extends { providerId: number; providerName: string }>(
  list: T[],
): T[] {
  const idMap = buildCanonicalIdMap()
  const seenIds = new Set<number>()
  const seenNames = new Set<string>()
  const result: T[] = []
  for (const item of list) {
    const providerId = idMap.get(item.providerId) ?? item.providerId
    const nameKey = normalizeProviderName(item.providerName)
    if (seenIds.has(providerId) || seenNames.has(nameKey)) continue
    seenIds.add(providerId)
    seenNames.add(nameKey)
    result.push({ ...item, providerId })
  }
  return result
}
