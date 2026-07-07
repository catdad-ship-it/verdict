# Verdict — Code Review & Project Plan

**Date:** July 4, 2026
**Purpose:** Implementation plan for corrections, efficiencies, and refactors, based on a full review of the codebase (all API routes, lib, pages, components, config, Dockerfile, fly.toml, and supabase migrations). Written to be handed to an implementation agent (Sonnet) and executed phase by phase.

**How to use this doc:** Work through phases in order. Each item has file:line references and a specific fix. Items within a phase are independent unless noted. Test on iOS Safari for anything touch-related (see CLAUDE.md gotchas). After each phase: `npm run lint && npx tsc --noEmit`, manual smoke test, then commit.

---

## Phase 0 — Critical bugs (user-facing, broken today)

### 0.1 Trending shelf is functionally broken (field mismatch)
`src/app/(app)/page.tsx:110-118, 798-815` expects `item.tmdbId`, `mediaType === 'show'`, and `releaseYear`. But `/api/trending` (`src/app/api/trending/route.ts:11-49`) returns raw `getMovie`/`getShow` shapes: the id field is `id`, TV items have `mediaType: 'tv'`, and shows carry `firstAirYear`. Result: every trending card has `tmdbId: undefined` (provider batch keys become `movie:undefined`, detail modal and trailer fetches use `tmdbId=undefined`, ADD posts a garbage body), and trending shows are treated as movies.

**Fix:** Normalize in the route — return `{ tmdbId: d.id, mediaType: 'movie' | 'tv', releaseYear: releaseYear ?? firstAirYear, ... }`. Then fix the Home consumer to accept `'tv'` (not `'show'`). See also item 3.5 (mediaType vocabulary cleanup) — do 0.1 minimally now, fully in Phase 3.

### 0.2 Password reset dead-ends at a 404
`src/app/(auth)/reset-password/page.tsx:18` sends `redirectTo: ${origin}/reset-password/confirm`, but that route doesn't exist. Additionally `src/middleware.ts:34` redirects any authenticated session (which a recovery link creates) away from auth pages to `/`, so the recovery session gets bounced even after the page exists.

**Fix:** Create `src/app/(auth)/reset-password/confirm/page.tsx` with a new-password form calling `supabase.auth.updateUser({ password })`, then redirect to `/`. Exempt `/reset-password/confirm` from the logged-in redirect in middleware.

### 0.3 RLS hole: any authenticated user can inject items into another user's list
`supabase/migrations/20260625_lists.sql:45-48` — the `list_items` INSERT policy only checks `auth.uid() = user_id`, not that `list_id` belongs to the caller. Share URLs expose list UUIDs publicly and the anon key is in the client bundle, so anyone can hit Supabase REST directly and insert rows that appear on someone else's public share page. The app-layer ownership check in `lists/[id]/items/route.ts` is not the security boundary.

**Fix:** New migration replacing the policy:
```sql
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM lists WHERE lists.id = list_id AND lists.user_id = auth.uid())
)
```

### 0.4 SpinWheelModal rules-of-hooks violation
`src/components/modals/SpinWheelModal.tsx:25` — `if (movies.length === 0) return null` runs before the `useEffect` at line 56; if `items` transitions to zero while mounted, React throws. Also the `requestAnimationFrame` loop in `spin()` (lines 58-77) has no cancellation on unmount.

**Fix:** Move the early return below all hooks; store the rAF id in a ref and cancel in a cleanup effect.

### 0.5 Dismiss failures return 200
`src/app/api/dismiss/route.ts:22-31` — upsert errors are only `console.error`'d and the route returns `{ ok: true }`, so failed dismissals look saved and the title reappears.

**Fix:** Return 500 when `upsertError` is set.

### 0.6 Marking a queued TV show watched never removes it from the queue
`src/app/api/watched/route.ts:53-60` — queue cleanup runs only in the movie branch, but queue_items supports `media_type = 'tv'`. Shows logged via PostWatch stay in the queue forever.

**Fix:** Mirror the movie cleanup in the show branch (first-watch only): delete queue rows matching `tmdb_id` + `media_type = 'tv'`.

### 0.7 `watched_shows` upsert silently nulls `episode_runtime`
`src/app/api/watched/route.ts:28-33` — every status/season update upserts `episode_runtime: runtime ?? null`; a call that omits `runtime` (e.g. a season bump) wipes the stored value.

**Fix:** Build the upsert payload conditionally — only include `episode_runtime` when `runtime != null`.

### 0.8 Dead/unreachable share API route
`src/app/api/share/[id]/route.ts` claims "public, no auth required," but middleware only whitelists `/share`, not `/api/share` — anonymous requests get redirected to `/login`. Nothing in the codebase calls this route (the share page queries via service client directly).

**Fix:** Delete the route. (If it's ever needed, add `/api/share` to `publicPrefixes` instead.)

### 0.9 Year in Review drops Dec 31
`src/app/api/stats/year/route.ts:12,19,24` — `lte('watched_at', 'YYYY-12-31')` compares against midnight on timestamptz, excluding anything watched Dec 31 after 00:00.

**Fix:** Use `.lt('watched_at', `${year+1}-01-01`)`.

### 0.10 `/api/tv/[id]` throws 500 instead of 404
`src/app/api/tv/[id]/route.ts:6-7` — `getShow()` throws on non-OK, so the `if (!show)` branch is dead and a missing show becomes an unhandled 500.

**Fix:** try/catch returning 404, mirroring `src/app/api/movie/[id]/route.ts:5-11`.

---

## Phase 1 — High-impact performance & robustness

### 1.1 Provider batching is defeated — request storm on every shelf page
`src/components/ui/VHSCard.tsx:65-80` self-fetches `/api/providers` whenever `providerData` is undefined at mount. But every parent renders cards *before* the batch resolves (`suggestions/page.tsx:59-63`, `new-releases/page.tsx:83-93`, `page.tsx:110-117`). On New Releases up to ~120 cards each fire their own request, then the batch result arrives anyway.

**Fix:** Add a `providersPending` (or `batchManaged`) prop to VHSCard that suppresses the self-fetch when a parent owns batching. Keep the self-fetch only for contexts with no batching parent.

### 1.2 Cap the providers batch endpoint
`src/app/api/providers/batch/route.ts:88` — `items` has no length cap; one POST can trigger thousands of parallel TMDB fetches (quota burn / self-DoS).

**Fix:** Dedupe, then `entries.slice(0, 60)`; reject bodies over a sane size with 400.

### 1.3 OMDB cache: unbounded, and misses are never cached
`src/lib/omdb.ts:6,22` — module-level Map grows forever on a long-lived Fly instance; `Response === 'False'` results return early *without* caching, so unknown titles are re-looked-up every time (New Releases does up to ~40 lookups/request against a 1,000/day free tier).

**Fix:** Cache negative results too; add TTL + max-size (or drop the Map and rely on the Next fetch data cache, which already keys by URL). Also bound New Releases enrichment: cap `nowFiltered.slice(0, 20)` before OMDB enrichment (`new-releases/route.ts:79`).

### 1.4 Queue backfill re-fires forever for TV shows with no runtime
`src/app/api/queue/route.ts:40` — TMDB often has empty `episode_run_time`, so `runtime` stays null and the row re-qualifies as missing on every GET (recurring TMDB fetch + DB UPDATE per row per page load).

**Fix:** Persist a sentinel (e.g. `runtime = -1` or a `backfilled_at` column via migration) so failed enrichment isn't retried on every request. Treat sentinel as "no data" when serializing.

### 1.5 Queue reorder: N sequential UPDATEs per drag
`src/app/api/queue/reorder/route.ts:18-25` — one UPDATE round-trip per queue item.

**Fix:** Single `upsert` of `[{id, sort_order}]` with `onConflict: 'id'` plus user_id guard (or a one-statement RPC).

### 1.6 Middleware: 401 JSON for APIs, skip auth on public routes
`src/middleware.ts:24-33` — two issues: (a) unauthenticated `/api/*` requests get a 302 HTML redirect, so client fetches with expired sessions throw on `res.json()`; (b) `getUser()` (a network call) runs before the public-prefix check, so `/share/...` visitors pay an auth round-trip for nothing.

**Fix:** Compute `isPublic` first and skip `getUser()` when public; return `NextResponse.json({error:'Unauthorized'},{status:401})` for unauthenticated `/api/*`.

### 1.7 Timeouts on all outbound fetches
`src/lib/tmdb.ts:15`, `omdb.ts:18`, `trakt.ts:19`, `fanart.ts:27`, `dtdd.ts:20`, `reddit.ts:22` — no timeout anywhere; a hung upstream stalls the route, and `Promise.all` fan-outs multiply exposure.

**Fix:** `AbortSignal.timeout(8000)` in the shared fetch helpers.

### 1.8 Parallelize the suggestions waterfall
`src/app/api/suggestions/route.ts:72-74` — cast/crew candidates (up to 6 TMDB calls) fully complete before discover/recommendations (up to 8 calls) start, but they're independent until the merge.

**Fix:** Run both branches concurrently and merge after `Promise.all`.

### 1.9 Cache trending server-side
`src/app/api/trending/route.ts:51` — trending is user-independent but re-runs the full Trakt + 10-TMDB-detail fan-out per request.

**Fix:** Wrap `trendingViaTrakt` in `unstable_cache` (or module-level memo) with ~30 min TTL.

### 1.10 Stale-response races on client fetches
`SearchAddModal.tsx:86-90` (debounced search never aborts in-flight requests) and Home list switching (`page.tsx:94-99,120-122`) — slow responses can land out of order and overwrite fresher results.

**Fix:** `AbortController` per request, or a request-token check before `setState`. Apply the same pattern to both.

### 1.11 Stuck skeleton + no `res.ok` checks
`page.tsx:82-87` — `fetchQueue` has no catch/finally; a failed fetch means permanent skeleton (same in `fetchListItems`). More broadly, no mutation in the app checks `res.ok` — failed adds/removes/saves look identical to success.

**Fix:** try/finally on all loaders; add a shared `apiFetch()` helper that throws on `!res.ok`; surface failures via toast (see Phase 4 error states).

---

## Phase 2 — Database & infra hygiene

### 2.1 Schema drift: repo SQL cannot rebuild production (HIGH)
Code writes columns/constraints that exist in no SQL file: `watched_movies.notes` and `is_rewatch` (`src/app/api/watched/route.ts:45-46`); `season_ratings` has been restructured — the route upserts `watched_show_id`/`notes` with `onConflict: 'watched_show_id,season_number'` (`season-ratings/route.ts:21-27`), while `supabase/schema.sql:100-109` still defines the old `user_id`/`show_tmdb_id` shape with no unique constraint.

**Fix:** Write a catch-up migration capturing real prod schema, and update `schema.sql` to match.

### 2.2 `sort_order` default conflict
`supabase/schema.sql:47` defaults `queue_items.sort_order` to 0, but `migrations/20260702_queue_reorder.sql` defines NULL as "no manual position." A fresh install from schema.sql silently breaks reorder semantics.

**Fix:** Change schema.sql to `default null`.

### 2.3 Missing indexes
`watched_movies` has no index on `user_id` yet every read filters on it (watched GET, stats, taste exclusion sets). Same for `season_ratings`' lookup key.

**Fix:** Migration: `create index on watched_movies (user_id, watched_at desc);` plus an index on season_ratings' actual prod lookup key (`watched_show_id, season_number`).

### 2.4 `watched_shows.updated_at` goes stale on upsert
Default only applies on insert; the upsert at `watched/route.ts:28-33` never sets it, but the GET orders by it.

**Fix:** Add `updated_at: new Date().toISOString()` to the upsert payload.

### 2.5 Node 20 is EOL
`Dockerfile:1` — `node:20-alpine` hit end-of-life April 2026; no more security patches.

**Fix:** Bump to `node:22-alpine`. Also modernize `ENV KEY value` → `ENV KEY=value` (lines 17, 31-32, 44).

### 2.6 Fly health check
`fly.toml` has no `[[http_service.checks]]` — a deploy that boots but 500s won't roll back.

**Fix:** Add a `/api/health` route (no auth — add to middleware public prefixes) and a checks block.

### 2.7 CSP header
`next.config.ts:14-26` — security headers exist but no Content-Security-Policy.

**Fix:** Add CSP: `default-src 'self'; img-src 'self' https://image.tmdb.org data:; frame-src https://www.youtube.com; connect-src 'self' https://<project>.supabase.co; style-src 'self' 'unsafe-inline'` (inline styles require it). Test thoroughly — trailer iframe and Supabase auth must keep working.

### 2.8 Tooling: lint fails, no typecheck, no tests, no CI
`npm run lint` currently errors (e.g. `no-explicit-any` at `new-releases/page.tsx:82`); no `typecheck` script; zero tests; no CI.

**Fix:** (a) Fix existing lint errors. (b) Add `"typecheck": "tsc --noEmit"`. (c) Add vitest + unit tests for pure logic: taste/exclusion in suggestions, `deriveGenrePreferences`, `finishTime.ts`, `utils.ts`. (d) Minimal GitHub Action running lint + typecheck + test on push. (e) Remove unused `date-fns` dep. (f) Add `import 'server-only'` to `src/lib/supabase/service.ts`. (g) Replace boilerplate README.

---

## Phase 3 — Refactors & consistency (do before Phase 4 UI work)

### 3.1 Extract shared TMDB enrichment helper
The "getShow/getMovie → runtime/releaseYear → getRatings fallback" block is triplicated with drift: `queue/route.ts:107-127`, `lists/[id]/items/route.ts:53-70`, `queue/route.ts:41-84` (queue falls back to `tmdbRating`, lists doesn't; different gate conditions).

**Fix:** One `enrichTitle(tmdbId, mediaType, existing)` in `src/lib/enrich.ts`; all three call sites use it. Pick the queue route's semantics (tmdbRating fallback) as canonical.

### 3.2 Move non-handler exports out of route files
`settings/preferences/route.ts:4-8` exports consts; `providers/route.ts:8-12` exports a type imported by `providers/batch/route.ts`; `activity/route.ts:4-12` exports `ActivityItem`. Runtime const exports from route.ts risk breaking `next build` validation on upgrade.

**Fix:** Move to `src/lib/preferences.ts` and `src/lib/providers.ts`; update imports. Also dedupe `getOwnedIds()` (identical in `providers/route.ts:14-24` and `providers/batch/route.ts:21-31`) into lib.

### 3.3 One TMDB→Movie mapper
`tmdb.ts` hand-maps `TMDBMovieResult` → `Movie` seven times (lines ~47-60, 69-82, 91-104, 140-153, 158-171, 195-208, 241-254) with subtle differences; the three `getNewToStreaming` page fetches (114-136) are copy-paste.

**Fix:** Single `toMovie(d, opts)` mapper; loop pages 1-3 with a shared params object.

### 3.4 Input validation on write routes
Missing everywhere: `queue/route.ts:96-140` (tmdb_id/title unchecked), queue DELETE (`eq('tmdb_id', undefined)` → 500), `watched/route.ts:22-25` (`user_rating` should be int 1-5), `season-ratings/route.ts:9-27`.

**Fix:** Small shared validators in `src/lib/validate.ts` (no need for zod); 400 on bad shape. Standardize error convention: 400 for missing/invalid params, `{ error }` + proper status everywhere (currently searches return `200 []` on missing q, providers returns `200 {providers:[]}` on missing tmdbId, dismiss returns 200 on failure).

### 3.5 Kill the `'tv'` vs `'show'` dual vocabulary
Translated ad hoc at every boundary (root cause of bug 0.1): tmdb lib returns `'tv'`, search API returns `'show'`, PostWatch converts, trending compares `'show'`.

**Fix:** Standardize on `'movie' | 'tv'` at every API boundary; convert to `'show'` only where the DB requires it, in one place.

### 3.6 Extract duplicated client logic
- `useMarkWatched()` hook — the `/api/watched` POST body is built 5× (`page.tsx:320-344`, `new-releases/page.tsx:140-153`, `suggestions/page.tsx:164-177`, `UpNextBar.tsx:43-65`, `watched/page.tsx:63-83`).
- `handlePickList` is verbatim-duplicated between suggestions and new-releases.
- `useBulkSelect` + `<BulkActionBar>` — select machinery duplicated between Home and Watched.
- `<Chip>` component — filter-chip rows tripled (`suggestions`, `SearchAddModal`, Home sort/filter).
- Home (909 lines) inlines a second list picker (`page.tsx:831-871`) duplicating the `ListPickerSheet` it already imports — delete the inline one; split Home into subcomponents (list selector dropdown, trending shelf, bulk bar).

### 3.7 Small cleanups
- `utils.ts:5` — CJS `require('./types')` inside ESM; use a static import.
- `types.ts:90-94` — duplicated `FinishTime` type drifted from `finishTime.ts`; delete the copy; have `calcFinishTime` use `formatRuntime`.
- `queue/route.ts:101` — `body.runtime ?? body.runtime` dead expression.
- `trailer/route.ts:29` — return `{ url: null, key: null }` for consistent shape.
- Delete unused `src/components/ui/TagSelector.tsx`.
- `share/[id]/page.tsx:22` — replace `select('*')` with the explicit column list the share API route uses (pulls `user_id` needlessly; refactor hazard).
- `reddit.ts:22-30` — check `res.ok` explicitly before parsing.
- `select('*')` over-fetch in `queue/route.ts:29` and `lists/[id]/items/route.ts:19` — explicit columns.
- `TitleDetailModal.tsx:357` — `allow="accelerate-compute"` → `accelerometer`.
- `NavBar.tsx:93-94,101-102` — dead hover handlers (same color both ways); remove.
- `login/page.tsx:60` — clock rendered during SSR causes hydration mismatch; set in `useEffect`.
- Stats heatmap timezone: `stats/page.tsx:71-74` mixes local dates with UTC keys (off-by-one in UTC+); `stats/route.ts:79-98` buckets heatmap in UTC but monthly in server-local — pick one convention end to end.

---

## Phase 4 — UX corrections (fixing what's misleading or inaccessible today)

### 4.1 Mobile hover-stick regression
`globals.css:51-53` disables hover only for `.vhs-card-hover` — a class nothing uses. VHSCard applies its lift via inline JS `onMouseEnter/onMouseLeave` (`VHSCard.tsx:108-116`), so on touch a tap leaves cards stuck raised/glowing — the exact iOS gotcha CLAUDE.md says was handled.

**Fix:** Move the hover effect into the CSS class, keep the `@media (hover: none)` guard, delete the JS handlers.

### 4.2 "ADDED" lies on picker-flow pages
`VHSCard.tsx:88-92` sets `localAdded` optimistically, but on Suggestions/New Releases the add button only opens `ListPickerSheet` — cancel and the card is stuck at "ADDED"; tapping it then fires a bogus `DELETE /api/queue`.

**Fix:** Don't set `localAdded` when the parent uses a picker flow; drive added state from the parent's `addedIds` only.

### 4.3 Shared accessible modal shell
No overlay has `role="dialog"`, `aria-modal`, focus trap, focus restore, Escape handling, or body scroll lock (six modals affected). A `TitleDetailModal` opened from a card can't be closed by keyboard; typing `n` behind it triggers Home's shortcut.

**Fix:** Build `<ModalShell>` (dialog role, focus trap, Escape, scroll lock, restores focus on close); migrate all six modals onto it. Then: keyboard access for card expansion (`VHSCard.tsx:122-130`, `QueueRow.tsx:213-217` — role="button", tabIndex, Enter/Space), accessible names on star buttons (`PostWatchModal.tsx:88-100`), `aria-live="polite"` on the toast region, `aria-expanded` + arrow keys on the Home list-selector dropdown.

### 4.4 Toast/undo integrity
`Toast.tsx:50,58` keeps only the last 2 toasts — older toasts' UNDO disappears while their deferred delete still commits; and a tab close within the 4.5s window means the delete never fires (item reappears).

**Fix:** Queue toasts instead of dropping; keep a pending-commit registry flushed on `pagehide`/`visibilitychange` (use `navigator.sendBeacon` or keepalive fetch).

### 4.5 Error states everywhere
Every page's failure mode is a lying empty state ("YOUR QUEUE IS EMPTY") or an infinite skeleton.

**Fix:** Shared "SIGNAL LOST — RETRY" error state (fits the VHS aesthetic) used by all pages; pairs with the `apiFetch` helper from 1.11.

### 4.6 Feedback polish (small, high-value)
- Adds should toast ("ADDED TO <LIST>") like removes do; surface "already in queue" instead of silent server dedupe.
- Share button: "LINK COPIED" toast; handle clipboard failure.
- Post-watch/add refresh: don't flip `loading=true` on refetch (`page.tsx:339`) — refetch silently or splice locally; the full-skeleton swap is jarring.
- SearchAddModal: show "NO RESULTS" for zero hits; title the modal with the actual destination list (currently always "ADD TO QUEUE").
- PostWatchModal: disable save while in flight (double-tap creates phantom rewatch rows).
- UpNextBar and Toast both anchor at `bottom: 70px` — stack toasts above the bar when it's visible.
- UpNextBar shows a stale pinned item after removal (pin-changed event fires before the deferred delete commits) — re-dispatch after commit/undo.
- Preferences response can clobber a user's already-changed sort (`page.tsx:104-109`) — only apply the default if the user hasn't touched sort yet.
- Mobile can't reach Settings mid-page (NavBar hides on scroll, BottomNav has no settings tab) — add settings to BottomNav or a "more" tab.
- Settings: auto-save on toggle (these are single-value prefs); kill the four separate save buttons.

---

## Phase 5 — UX/UI improvements & new features (recommendations)

Ordered by value-for-effort. My recommendation: do 5.1–5.4 next; they close obvious gaps in existing flows. 5.5+ are net-new surface area.

### 5.1 Finish the TV story (biggest gap in the product)
TV is half-implemented today: marking a show watched silently sets `status: 'watching'` with no explanation, there's no way to mark a show finished anywhere in the UI, and the Watched shows tab is read-only (no rewatch/edit/season affordances that movies get).
- Add explicit status control (WATCHING / FINISHED / ABANDONED) in PostWatch for TV and on the Watched shows tab.
- Per-season rating entry from the Watched tab (the API + `season_ratings` table already exist).
- Optional: "currently watching" shelf on Home for in-progress shows — the data is already there.

### 5.2 Client-side data cache
No caching anywhere: reopening the same TitleDetailModal refires 4 requests; queue is fetched 3× on cold landing (layout count, UpNextBar, Home). A tiny module-level Map keyed `mediaType:tmdbId` for detail/logo/warnings, plus passing `providerData` from card into modal, kills most of it. If appetite allows, a minimal SWR-style hook for queue/lists shared across Home/UpNextBar/NavBar LED (which currently goes stale after client-side adds).

### 5.3 Server components for read-only pages
Stats (and the Watched initial payload) are pure renders of GET data — converting to async server components ships HTML with data, removes the fetch-after-hydrate waterfall and a chunk of client JS. Stats is the clean first candidate.

### 5.4 "Leaving soon" + availability alerts
You already track queue + owned streaming services. Two natural extensions:
- **Leaving Soon shelf** on New Releases: titles in your queue leaving your services (TMDB provider data + a nightly diff stored per user).
- **Now streamable badge**: when a queued title becomes available on an owned service, badge it on Home ("NOW ON NETFLIX"). This is the single most actionable notification a watchlist app can give.

### 5.5 Import from Letterboxd / IMDb CSV
One-time importer (Settings → Import): parse Letterboxd export zip / IMDb ratings CSV, match via TMDB search, bulk-insert watched history with ratings + dates. Instantly makes Stats/Year-in-Review meaningful for a new user and it's the main switching cost from other trackers.

### 5.6 Shareable Year in Review card
Stats page already computes Year in Review. Render a static share card (1080×1920 story format, VHS aesthetic — "BRADY'S 2026 REWIND") via an OG-image-style route (`@vercel/og` / satori works on Fly), with a share/download button. Cheap, on-brand, and it's organic distribution.

### 5.7 Command palette / quick add
`n` already opens search on Home. Promote to a global ⌘K palette (search titles, jump to pages, quick actions: pin, mark watched, spin the wheel). Desktop-only affordance; the VCR aesthetic fits an "INSERT TAPE" prompt nicely.

### 5.8 PWA install + share-target
Manifest + service worker (cache shell only, no offline data complexity): home-screen install on iOS gets rid of Safari chrome. Android share-target lets "share → Verdict" from YouTube/IMDb/Letterboxd add straight to the queue.

### 5.9 Better spin/decision tools
SpinWheelModal + WatchTonightModal exist; the "what should I actually watch" decision is the core nightly use case. Add filters to spin (runtime ≤ X — pairs with `finishTime.ts`, on my services only, genre mood), and a "finish by" mode: "I have until 11pm" → only titles that fit.

### 5.10 Collaborative / richer lists
Lists are share-by-URL read-only. Options in ascending effort: (a) explicit `is_shared` flag so lists are private by default (also closes the "every list is world-readable by UUID" posture — see 0.3 note); (b) shared list with a partner via invite (two user_ids on a list); (c) "vote mode" on a shared list for picking movie night with someone.

### 5.11 Taste insights page
`taste_profiles` powers suggestions invisibly. A "YOUR TASTE" panel on Stats — top genres/decades/directors you rate highest vs most-watched, what the suggester thinks you like with the ability to correct it ("less horror") — turns the black box into a feature and improves suggestions with explicit signal.

---

## Suggested commit sequence for Sonnet

1. **Phase 0** — one commit per item (0.1–0.10), each independently testable. Deploy after.
2. **Phase 1** — commits 1.1+1.2 (providers), 1.3 (OMDB), 1.4+1.5 (queue), 1.6+1.7 (middleware/timeouts), 1.8+1.9 (suggestions/trending), 1.10+1.11 (client fetch robustness). Deploy after.
3. **Phase 2** — DB migrations first (2.1–2.4, verify against prod schema before writing!), then infra (2.5–2.7), then tooling (2.8). Deploy after.
4. **Phase 3** — refactors, lint must pass at each commit. No behavior changes; smoke-test queue/watched/suggestions flows.
5. **Phase 4** — UX corrections; test each on iOS Safari (real device or simulator).
6. **Phase 5** — feature work, each item its own branch/PR-sized effort.

**Verify at every phase:** `npm run lint && npx tsc --noEmit`, manual smoke test of home/watched/suggestions/new-releases/stats, then `git add . && git commit && git push && fly deploy` per CLAUDE.md.

**Update CLAUDE.md** as items land — especially anything that changes documented behavior (mediaType vocabulary, share model, middleware public prefixes).
