# Verdict — Project Memory

## What This Is

Verdict is a personal movie/TV tracker with a VHS aesthetic (dark amber/cream palette, monospace fonts, VCR UI). Built by Brady Nieman. Deployed at `verdict-bnieman.fly.dev`.

**Stack:** Next.js 16 App Router (TypeScript), Supabase (Postgres + Auth + RLS), TMDB API, OMDB API, deployed on Fly.io.

---

## Project Structure

```
src/
  app/
    (app)/              # Auth-protected routes
      page.tsx          # Home — queue/lists with search, filter, sort
      stats/page.tsx    # Stats bento grid
      watched/page.tsx  # Watched history (movies + shows)
      new-releases/page.tsx
      suggestions/page.tsx
      lists/[id]/page.tsx
      share/[id]/page.tsx  # Public share pages (no auth required)
    api/
      queue/route.ts
      watched/route.ts
      stats/route.ts
      stats/year/route.ts
      suggestions/route.ts
      new-releases/route.ts
      providers/route.ts    # Streaming + rent/buy availability
      lists/route.ts
      lists/[id]/route.ts
      lists/[id]/items/route.ts
      share/[id]/route.ts
      dismiss/route.ts
  components/
    ui/
      NavBar.tsx          # Uses lucide-react Play/LogOut icons (NOT Unicode ▶ ⏏ — iOS renders those as system media controls)
      BottomNav.tsx
      VHSCard.tsx         # Always renders provider strip (minHeight: 29) for consistent card height; shows $ RENT / $$ BUY badges
      ListPickerSheet.tsx
      WatchTonightModal.tsx
    modals/
      PostWatchModal.tsx
      WatchTonightModal.tsx
  lib/
    tmdb.ts              # getMovie() returns tmdbRating (vote_average) as fallback
    types.ts             # Canonical types — use @/lib/types, NOT src/types/index.ts (deleted)
    utils.ts
  middleware.ts           # Auth guard — must export named `middleware`. /share and /api/health skip auth entirely.
```

---

## Key Technical Decisions & Gotchas

### iOS Safari
- Use Lucide SVG icons instead of Unicode `▶` and `⏏` in interactive elements — iOS treats those as system media controls
- `fontSize: 16` minimum on inputs to prevent iOS auto-zoom
- Use `dvh` not `vh` for modal heights (`maxHeight: '88dvh'`)
- Add `touchstart` listeners alongside `mousedown` for dropdown close handlers
- Touch targets: `minWidth: 44, minHeight: 44`
- `@media (hover: none)` disables card hover effects on mobile

### Next.js / Fly.io
- `NEXT_PUBLIC_` vars must be in `[build.args]` in `fly.toml` — they're baked at build time. `fly secrets set` only sets runtime env vars and won't work for these.
- `fly.toml` currently has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as build args — this is intentional. The anon key is a publishable key, safe to expose.
- Middleware must be at `src/middleware.ts` with `export async function middleware()` — a different export name means Next.js never runs it.
- `Dockerfile` runs `node:22-alpine`. `fly.toml` has a health check against `/api/health` (no auth, no DB round trip) so a deploy that boots but 500s rolls back instead of going live.

### React Patterns
- Define components at module scope, not inside render functions — inline component definitions cause React to see a new type on every render, unmounting/remounting all children (including re-firing provider fetches in VHSCard)
- Use `useMemo` for expensive derived state (e.g., filtered/sorted queue items)

### Ratings
- OMDB API returns IMDb + RT ratings; stored as `imdb_rating` and `rt_score`
- TMDB `vote_average` is used as `tmdbRating` fallback when OMDB has no data
- Backfill condition in queue GET: `r.runtime == null || (r.media_type !== 'tv' && r.imdb_rating == null)`

### New Releases / Suggestions Filtering
- Queue items AND watched titles are excluded from both new releases and suggestions
- `getUserTaste()` in new-releases route fetches queue + watched tmdb_ids and returns them as `exclude: Set<number>`
- Suggestions API slices `excludeIds` param to 200 max before querying

### Providers API
- Returns `hasRent` and `hasBuy` booleans in addition to streaming providers
- Does NOT early-return when no `flatrate` — uses `(us?.flatrate ?? [])` to fall through

### Third-party enrichment APIs (all free-tier, all optional/graceful)
- **Trakt** (`src/lib/trakt.ts`) — trending movies/shows for the Home "Trending Now" shelf. Gives a direct TMDB id per result, no title-matching needed. Needs `TRAKT_CLIENT_ID`. Without it, `/api/trending` falls back to the older Reddit-scrape-and-fuzzy-match approach (`src/lib/reddit.ts`, kept around specifically as this fallback).
- **Fanart.tv** (`src/lib/fanart.ts`) — transparent title-logo art in `TitleDetailModal`'s header, replacing the plain text title when available. Movies are keyed by TMDB id directly; TV shows require bridging through TMDB's `external_ids` to get a TVDB id first (`getTvdbId` in `tmdb.ts`) since fanart.tv's TV endpoint doesn't accept TMDB ids. Needs `FANART_API_KEY`. Without it, the modal just shows the plain text title.
- **Does The Dog Die** (`src/lib/dtdd.ts`) — community content-warning votes ("Content notes" section in `TitleDetailModal`). Uses only the free-tier endpoints (search + item detail + `topicItemStats` vote totals) — deliberately not the paid "Scene Alerts" tier. Needs `DDD_API_KEY`. Without it, the section doesn't render.
- All three follow the same pattern: check a `*Configured()` helper or just let a missing key produce a `null`/`[]` result, never throw — none of this should ever block or break the modal.

### Trailer
- `/api/trailer` returns both `url` (external youtube.com link) and `key` (raw video id)
- `TitleDetailModal` plays the trailer inline via a YouTube iframe embed using `key` — no more tabbing out to YouTube

### Security
- `src/middleware.ts`: `/share` and `/api/health` skip the auth check entirely (no `getUser()` round-trip — neither depends on session state). `/login`, `/signup`, `/reset-password` are reachable without a session but bounce a logged-in user to `/` (except `/reset-password/confirm`, which needs the session a recovery link creates). Everything else requires auth; unauthenticated `/api/*` gets a 401 JSON body, everything else redirects to `/login`.
- Security headers in `next.config.ts`: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. CSP needs `'unsafe-inline'` on script-src/style-src (Next's App Router hydration scripts, and this app's inline `style={{}}` usage) — see the comment above the header for the full rationale.
- List ownership checked both at the app layer (`lists/[id]/items/route.ts`) and via RLS (`list_items` INSERT/UPDATE requires the target `list_id` to belong to the caller — see `supabase/migrations/20260704_fix_list_items_ownership.sql`)
- `/api/share/[id]` was deleted (dead/unreachable) — the public share page (`src/app/share/[id]/page.tsx`) queries Supabase directly via the service-role client instead
- `src/lib/supabase/service.ts` (service-role client, bypasses RLS) has `import 'server-only'` — an accidental client-bundle import is a build error, not a silent leak

---

## CSS Variables (globals.css)

```
--amber        primary accent color (warm orange)
--amber-dim    muted amber for borders
--cream        primary text
--cream-dim    secondary text
--muted        tertiary / placeholder text
--surface      card background
--raised       elevated card background
--bg           page background
--border       default border color
--font-mono    monospace font family
```

---

## Completed Features

- Queue with sort/filter/search, pin "On Deck" title, Watch Tonight mode
- Streaming providers + rent/buy badges on cards
- Post-watch flow: rating (1–5 stars), what worked tags, notes, want more like this
- Watched history with rewatch tracking and expanded history view
- Stats page: hero count, avg rating, top genres, tag cloud, rating breakdown, activity by month, Year in Review
- New Releases: Now Playing, Coming Soon, New to Streaming (all filtered against queue + watched)
- Suggestions: taste-profile-based, paginated, filtered against queue + watched
- Lists: create, add items, share via public URL
- Auth via Supabase (middleware-protected)
- Mobile-first: lucide icons, dvh, font-size 16 on inputs, touch targets, no hover on mobile
- Legibility pass: `--muted` reserved for decorative-only elements, 11px floor on all inline font sizes
- Click-to-expand `TitleDetailModal`: bottom sheet (desktop: centered), swipe-to-dismiss, full synopsis/ratings/genres/cast/provider list/trailer — VHSCard stays a fast-scan summary
- Trending shelf backed by Trakt (Reddit-scrape fallback), title-logo art via Fanart.tv, content warnings via Does The Dog Die — all three optional/gracefully degrading without an API key

---

## Stats Page Font Sizes (after mobile fix)

All labels use minimum 11px. Key sizes:
- `CardLabel`: 11px
- Tag cloud: `11 + ratio * 5` (range 11–16px)
- Genre names: 12px
- Hero meta text: 12–13px
- Month labels in activity chart: 10px
- Bar chart counts: 11px, star labels: 10px

---

## Tooling

```bash
npm run lint       # eslint — must pass with 0 errors
npm run typecheck  # tsc --noEmit
npm test           # vitest run — unit tests for pure logic (suggestions, finishTime, utils)
```

CI (`.github/workflows/ci.yml`) runs all three on every push to `main` and every PR.

## Deploy

```bash
git add .
git commit -m "message"
git push
fly deploy
```

App: `verdict-bnieman` on Fly.io, region `iad`, 512mb shared CPU.

Supabase migrations under `supabase/migrations/` are **not** run automatically anywhere (no CLI/pipeline wired up) — apply new ones manually in the Supabase SQL editor before or after deploying, as appropriate.
