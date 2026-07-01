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
