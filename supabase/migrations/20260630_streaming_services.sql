-- ── Streaming service preferences ────────────────────────────────────────────
-- Which paid streaming subscriptions the user has, so cards can show "on your
-- plan" vs "rent/buy elsewhere" instead of a generic list of every provider.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS streaming_provider_ids integer[] DEFAULT '{}';
