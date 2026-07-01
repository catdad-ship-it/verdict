-- Manual drag-to-reorder for the queue. NULL means "no manual position yet"
-- (falls back to added_at ordering); once a user drags any row, every row
-- currently in the queue gets an explicit sort_order.
ALTER TABLE public.queue_items
  ADD COLUMN IF NOT EXISTS sort_order integer;
