-- Drag-to-reorder was issuing one UPDATE round-trip per queue item. A plain
-- upsert of [{id, sort_order}] doesn't work here: queue_items has several
-- NOT NULL columns without defaults (tmdb_id, media_type, title, user_id),
-- and Postgres validates those on the candidate insert row before it even
-- checks for a conflict — so a partial-column upsert throws, and supplying
-- placeholder values for those columns would overwrite real data on
-- conflict. A single UPDATE ... FROM unnest(...) does the whole batch in
-- one statement instead.
create or replace function public.reorder_queue_items(p_ids uuid[], p_positions integer[])
returns void
language sql
security invoker
as $$
  update public.queue_items
  set sort_order = v.sort_order
  from unnest(p_ids, p_positions) as v(id, sort_order)
  where public.queue_items.id = v.id
    and public.queue_items.user_id = auth.uid();
$$;

grant execute on function public.reorder_queue_items(uuid[], integer[]) to authenticated;
