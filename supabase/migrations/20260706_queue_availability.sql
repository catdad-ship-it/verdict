-- Availability tracking for queue items (5.4): lets the app detect when a
-- queued title becomes available on — or drops off — one of the user's
-- owned streaming services, by snapshotting the owned-provider set each
-- time it's checked and diffing against the previous snapshot.
-- Purely additive — safe regardless of the column's current absence.
ALTER TABLE public.queue_items
  ADD COLUMN IF NOT EXISTS last_owned_provider_ids integer[],
  ADD COLUMN IF NOT EXISTS providers_checked_at timestamptz;
