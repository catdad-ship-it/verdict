-- The keep-alive workflow (.github/workflows/supabase-keepalive.yml) used to
-- do an anon SELECT on `lists` twice a week. Every run succeeded, but the
-- free-tier project still auto-paused (Oct 2026) — a read that RLS filters
-- down to zero rows evidently doesn't count as activity. Supabase doesn't
-- document what does; the most consistent report is that a real write does.
-- So the ping now calls this function, which bumps a single timestamp row.
--
-- security definer so anon can bump the timestamp without any policy on the
-- table: RLS is on with no policies, so anon can't read or write `keepalive`
-- directly, only call this one narrow function. Anyone else calling it just
-- moves the timestamp.
create table if not exists public.keepalive (
  id smallint primary key default 1 check (id = 1),
  pinged_at timestamptz not null default now()
);

alter table public.keepalive enable row level security;

insert into public.keepalive (id) values (1) on conflict (id) do nothing;

create or replace function public.keepalive_ping()
returns timestamptz
language sql
security definer
set search_path = ''
as $$
  update public.keepalive
  set pinged_at = now()
  where id = 1
  returning pinged_at;
$$;

grant execute on function public.keepalive_ping() to anon;
