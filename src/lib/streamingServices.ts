// Curated set of mainstream US streaming subscriptions users can pick from in
// Settings. IDs are TMDB's watch-provider IDs (same ones already used in
// tmdb.ts getNewToStreaming) — stable and won't change. Logos are still
// fetched live from TMDB in the settings API so they never go stale; names
// are hardcoded here too since we need them to match ad-tier duplicates
// (see normalizeProviderName below) without an extra network round trip on
// every /api/providers call.
export const CURATED_PROVIDERS: { id: number; name: string }[] = [
  { id: 8,    name: 'Netflix' },
  { id: 9,    name: 'Amazon Prime Video' },
  { id: 337,  name: 'Disney Plus' },
  { id: 15,   name: 'Hulu' },
  { id: 1899, name: 'Max' },
  { id: 386,  name: 'Peacock' },
  { id: 531,  name: 'Paramount Plus' },
  { id: 350,  name: 'Apple TV Plus' },
  { id: 43,   name: 'Starz' },
  { id: 37,   name: 'Showtime' },
  { id: 526,  name: 'AMC Plus' },
]

export const CURATED_PROVIDER_IDS = CURATED_PROVIDERS.map(p => p.id)

// TMDB frequently lists the same real-world service under more than one
// provider_id/name — e.g. "Amazon Prime Video" vs a second row for the
// ad-supported tier, or "Netflix" vs "Netflix Standard with Ads". These
// splits are inconsistent and not centrally documented, so instead of
// maintaining a brittle id-to-id alias table, normalize by name: strip
// ownership/tier qualifiers ("with ads", "standard", "basic", "amazon") and
// punctuation, so "Netflix Standard with Ads" and "Netflix" both collapse to
// "netflix". Used both to dedupe the display list and to match a title's
// providers against what the user actually owns.
export function normalizeProviderName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\bwith ads\b/g, '')
    .replace(/\bstandard\b/g, '')
    .replace(/\bbasic\b/g, '')
    .replace(/\bamazon\b/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}
