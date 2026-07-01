// Curated set of mainstream US streaming subscriptions users can pick from in
// Settings. IDs are TMDB's watch-provider IDs (same ones already used in
// tmdb.ts getNewToStreaming) — stable and won't change. Names/logos are still
// fetched live from TMDB in the settings API so logos never go stale.
export const CURATED_PROVIDER_IDS = [
  8,    // Netflix
  9,    // Prime Video
  337,  // Disney+
  15,   // Hulu
  1899, // Max
  386,  // Peacock
  531,  // Paramount+
  350,  // Apple TV+
  43,   // Starz
  37,   // Showtime
  526,  // AMC+
] as const

// TMDB lists some real-world services under more than one provider_id (a
// known data quirk — see themoviedb.org/talk/6558a99b0816c700e01ae3a3). Map
// the duplicate onto the canonical id we actually offer in Settings so a
// title doesn't show up as "streaming, but not on your service" twice for
// the same service, and so owning one is recognized as owning both.
const PROVIDER_ALIASES: Record<number, number> = {
  119: 9, // "Amazon Prime Video" duplicate → Prime Video (9)
}

export function canonicalProviderId(id: number): number {
  return PROVIDER_ALIASES[id] ?? id
}
