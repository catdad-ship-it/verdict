-- ── Streaming service preferences ────────────────────────────────────────────
-- Which paid streaming subscriptions the user has, so cards can show "on your
-- plan" vs "rent/buy elsewhere" instead of a generic list of every provider.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS streaming_provider_ids integer[] DEFAULT '{}';

-- The original schema only had SELECT/UPDATE policies on profiles (no
-- INSERT), so any account whose profiles row didn't already exist — e.g.
-- predating the auto-create-on-signup trigger — could never save settings:
-- an UPDATE against a missing row matches nothing and "succeeds" without
-- writing anything. The settings API now upserts, which needs INSERT too.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
