-- Prod's queue_items.media_type check constraint had drifted to movie-only,
-- so every TV insert failed with 23514 (the POST route swallowed the 500 and
-- the UI still showed "ADDED"). This drops the stale constraint, normalizes
-- any dirty media_type values to exactly 'movie'/'tv' (trims hidden
-- whitespace + fixes casing), then re-adds the correct constraint.
-- Applied by hand in the Supabase SQL editor on 2026-07-07; committed here so
-- the repo matches prod and a fresh DB build comes out correct.

begin;

alter table public.queue_items drop constraint if exists queue_items_media_type_check;

update public.queue_items
set media_type = case
  when lower(btrim(media_type)) in ('tv', 'show', 'series') then 'tv'
  else 'movie'
end;

alter table public.queue_items
  add constraint queue_items_media_type_check check (media_type in ('movie', 'tv'));

commit;
