-- ── Settings expansion ───────────────────────────────────────────────────────
-- Backs: genre tuning in Suggestions, New Releases shelf toggles, default
-- queue sort.

-- dismissed_genre_ids already exists in production (used by /api/dismiss)
-- but was never captured in a migration — formalizing it here.
ALTER TABLE public.taste_profiles
  ADD COLUMN IF NOT EXISTS dismissed_genre_ids integer[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_genre_ids integer[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS excluded_genre_ids  integer[] DEFAULT '{}';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hidden_shelves      text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS default_queue_sort  text   DEFAULT 'added';

-- taste_profiles already has a "FOR ALL USING (auth.uid() = id)" policy,
-- which Postgres also applies as the WITH CHECK for inserts — no additional
-- policy needed there (unlike profiles, which needed one last migration).
