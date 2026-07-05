# Verdict

A personal movie/TV tracker with a VHS aesthetic — queue, watched history,
suggestions, new releases, stats, and shareable lists. Built with Next.js
(App Router), Supabase (Postgres + Auth + RLS), TMDB, and OMDB. Deployed on
Fly.io.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in the keys below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

See `.env.local.example` for the full list and where to get each key.
Required: Supabase project URL/anon key/service role key, and a TMDB API
key. Optional (each degrades gracefully without it): OMDB, Trakt, Fanart.tv,
Does The Dog Die.

### Database

Run `supabase/schema.sql` in a fresh Supabase project's SQL editor, then
apply everything in `supabase/migrations/` in filename order.

## Scripts

```bash
npm run dev         # start the dev server
npm run build        # production build
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm test             # vitest run
```

## Deploy

```bash
git push
fly deploy
```

Deployed as `verdict-bnieman` on Fly.io (region `iad`). `NEXT_PUBLIC_*`
env vars are baked in at build time via `[build.args]` in `fly.toml` —
`fly secrets set` only affects runtime env vars and won't update them.
