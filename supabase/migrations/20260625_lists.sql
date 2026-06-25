-- ── Lists ─────────────────────────────────────────────────────────────────────
-- Custom named lists (separate from the queue)

CREATE TABLE IF NOT EXISTS lists (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own lists"
  ON lists FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS lists_user_id_idx ON lists (user_id);


-- ── List items ────────────────────────────────────────────────────────────────
-- Movies / shows inside a list. Mirrors queue_items structure.

CREATE TABLE IF NOT EXISTS list_items (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id      UUID        REFERENCES lists(id) ON DELETE CASCADE NOT NULL,
  user_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tmdb_id      INTEGER     NOT NULL,
  media_type   TEXT        NOT NULL DEFAULT 'movie',
  title        TEXT        NOT NULL,
  poster_path  TEXT,
  genre_ids    INTEGER[]   DEFAULT '{}',
  runtime      INTEGER,                   -- minutes (movies) or avg episode (tv)
  release_year INTEGER,
  imdb_rating  NUMERIC(3,1),
  rt_score     INTEGER,
  overview     TEXT,
  added_at     TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (list_id, tmdb_id, media_type)   -- no duplicates within a list
);

ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own list items"
  ON list_items FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS list_items_list_id_idx ON list_items (list_id);
CREATE INDEX IF NOT EXISTS list_items_user_id_idx ON list_items (user_id);
