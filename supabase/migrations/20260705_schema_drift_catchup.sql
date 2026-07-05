-- Catch-up migration for columns/constraints the app already writes/reads
-- in production but that were never captured in schema.sql or a migration.
-- Purely additive (IF NOT EXISTS everywhere) — safe to run regardless of
-- whatever the live table currently looks like; doesn't touch or drop
-- anything else that might still be there.

-- watched_movies.notes / .is_rewatch — written by POST /api/watched
-- (src/app/api/watched/route.ts) on every movie log.
ALTER TABLE public.watched_movies
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS is_rewatch boolean DEFAULT false;

-- season_ratings was restructured at some point from the original
-- schema.sql's (user_id, show_tmdb_id) shape to key off watched_shows.id
-- instead — src/app/api/season-ratings/route.ts upserts watched_show_id +
-- notes with onConflict: 'watched_show_id,season_number', which requires a
-- matching unique constraint (already must exist in prod for that upsert
-- to work at all; recreated here under an explicit name in case it doesn't
-- have one, or has one under a different name — CREATE UNIQUE INDEX IF NOT
-- EXISTS only skips on a name collision, so this is harmless either way).
ALTER TABLE public.season_ratings
  ADD COLUMN IF NOT EXISTS watched_show_id uuid REFERENCES public.watched_shows(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE UNIQUE INDEX IF NOT EXISTS season_ratings_show_season_unique
  ON public.season_ratings (watched_show_id, season_number);
