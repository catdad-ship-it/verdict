-- watched_movies has no index on user_id despite every read filtering on it
-- (watched GET, stats, taste-exclusion sets). The season_ratings lookup key
-- index was already created as a side effect of the unique constraint added
-- in 20260705_schema_drift_catchup.sql.
CREATE INDEX IF NOT EXISTS watched_movies_user_id_watched_at_idx
  ON public.watched_movies (user_id, watched_at DESC);
