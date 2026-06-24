-- ══════════════════════════════════════════
-- VERDICT — Supabase Schema
-- Run this in your Supabase SQL editor
-- ══════════════════════════════════════════

-- ── Profiles (extends Supabase auth.users) ──
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Queue items (movies + shows to watch) ──
create table public.queue_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  title text not null,
  poster_path text,
  genre_ids integer[],
  runtime integer,         -- minutes (movies) or episode runtime (shows)
  release_year integer,
  imdb_rating numeric(3,1),
  rt_score integer,
  added_at timestamptz default now(),
  sort_order integer default 0
);

alter table public.queue_items enable row level security;
create policy "Users manage own queue" on public.queue_items
  for all using (auth.uid() = user_id);

create unique index queue_unique on public.queue_items (user_id, tmdb_id, media_type);

-- ── Watched movies ──
create table public.watched_movies (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  tmdb_id integer not null,
  title text not null,
  poster_path text,
  genre_ids integer[],
  runtime integer,
  release_year integer,
  imdb_rating numeric(3,1),
  rt_score integer,
  user_rating integer check (user_rating between 1 and 5),
  what_worked text[],       -- array of tags: 'The Concept', 'The Cast', etc.
  want_more_like_this boolean default true,
  watched_at timestamptz default now()
);

alter table public.watched_movies enable row level security;
create policy "Users manage own watched" on public.watched_movies
  for all using (auth.uid() = user_id);

-- ── Watched shows (season-level tracking) ──
create table public.watched_shows (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  tmdb_id integer not null,
  title text not null,
  poster_path text,
  genre_ids integer[],
  status text not null check (status in ('watching', 'finished', 'dropped')),
  current_season integer default 1,
  total_seasons integer,
  episode_runtime integer,  -- avg episode runtime in minutes
  updated_at timestamptz default now()
);

alter table public.watched_shows enable row level security;
create policy "Users manage own shows" on public.watched_shows
  for all using (auth.uid() = user_id);

create unique index show_unique on public.watched_shows (user_id, tmdb_id);

-- ── Season ratings ──
create table public.season_ratings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  show_tmdb_id integer not null,
  season_number integer not null,
  user_rating integer check (user_rating between 1 and 5),
  what_worked text[],
  want_more_like_this boolean default true,
  rated_at timestamptz default now()
);

alter table public.season_ratings enable row level security;
create policy "Users manage own season ratings" on public.season_ratings
  for all using (auth.uid() = user_id);

-- ── User taste profile (for suggestion engine) ──
create table public.taste_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  top_genres integer[],          -- TMDB genre IDs, ordered by preference
  top_genre_names text[],
  loved_tmdb_ids integer[],      -- movies/shows rated 4-5
  disliked_tmdb_ids integer[],   -- movies/shows rated 1-2
  prefers_subtitles boolean default false,
  updated_at timestamptz default now()
);

alter table public.taste_profiles enable row level security;
create policy "Users manage own taste profile" on public.taste_profiles
  for all using (auth.uid() = id);
