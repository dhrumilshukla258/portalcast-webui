# Video Playback & Navigation — Skill Reference

Covers `useAppNavigation.ts` and `useMediaLibrary.ts` — how browsing (movies/series/live TV grids, season/episode drill-down) and playback URL resolution work, plus several real bugs fixed in this area. Backend counterpart: stalker-m3u-server's `skill-stream-tokens.md`.

---

## The backend always hands back a ready-to-use URL now

Since the backend moved to opaque stream tokens (see stalker-m3u-server's `skill-stream-tokens.md`), **every stream URL the frontend receives is already fully routed through the backend** — `/live.m3u8?t=...`, `/api/proxy?t=...`. There is nothing left for the client to wrap, encode, or resolve further.

This means the old `buildProxiedUrl()` helper (`${BASE_URL}/proxy?url=${btoa(raw)}` — client-side base64-wrapping) is **gone**. It's not just unused, it was actively harmful once the backend stopped accepting a raw `url=` param — using it would either double-wrap an already-tokenized URL (`?url=<base64 of "/api/proxy?t=...">`, which the backend can't resolve, sent as an actual failing request) or, worse, wrap a genuinely raw URL that should never have reached the client in the first place. If you see `btoa(` or `/proxy?url=` reappear anywhere in a diff, that's a regression — grep the whole `src/` tree for it before merging.

### There used to be a shortcut here — it's gone, don't re-add it

`resolveStreamUrl()` (in `useAppNavigation.ts`) used to have:
```ts
if (!isPortal && item.cmd) return { raw: item.cmd, proxied: item.cmd };
```
for Xtream-provider setups (`isPortal === false`). This looked like a reasonable optimization ("we already have a cmd, skip the round-trip") but is fundamentally unsafe for episode/movie **files**: unlike live channels (whose `item.cmd` *is* pre-tokenized by the backend's `mapChannel()`, for both provider types), `item.cmd` on a movie/episode grid card or resolved file comes straight from the raw listing API (`/api/v2/movies`) — **never tokenized**. Using it directly:
1. Leaks the real upstream URL (sometimes with embedded admin credentials) straight to the browser.
2. Breaks playback outright — browsers generally can't play an arbitrary external CDN URL directly (CORS, wrong host, missing auth headers the portal expects).

Symptom when this was broken: episode/movie playback failed immediately after clicking play, with **zero** `/api/v2/movie-link` request in the server log (because the shortcut skipped calling it entirely) — log just jumped straight from the episode-file fetch to the video player's own JS chunks loading. If you ever see that log pattern again, check for a reintroduced shortcut like this first.

**Rule going forward**: never use `item.cmd`/a resolved file's `.cmd` directly for movie/episode playback. Always resolve through `resolveStreamUrl()`, which always calls the backend (`getMovieUrl` → `/api/v2/movie-link`).

---

## Title/category display metadata — why it needs explicit overrides

The Stats tab's Live Streams table (see `skill-admin-panel.md`) shows a `label`/`category` the backend stores per stream session. The frontend sends these as `title`/`category` query params on the `/api/v2/movie-link` request.

**The trap**: for Stalker portals, the *resolved playable file* (`episodeFile`/`movieFile`, from `getMedia({movieId, seasonId, episodeId})`) has its own `.title`/`.name` field that's frequently just a **quality/language descriptor** — e.g. `"Hindi / Excellent quality (1080)"`, `"English / Ultra high quality (4K)"` — not the actual episode/movie title. If you naively do `resolveStreamUrl(episodeFile, ...)` and let it fall back to `episodeFile.title || episodeFile.name`, that's what shows up in the admin view.

**Fix pattern**: `resolveStreamUrl()` takes an optional 3rd param, `displayOverride: { title?, category?: string }`, which — when provided — wins over anything derived from the resolved file. Callers build it from the *real* metadata, not the resolved file:

```ts
// Series episode (startPlayback, useAppNavigation.ts)
const seriesName = currentSeriesItem?.title || currentSeriesItem?.name;
const episodeLabel = item.title || item.name || `Episode ${item.episode_num}`;
const displayTitle = [seriesName, episodeLabel].filter(Boolean).join(' - ');
// item = the real episode list entry (not episodeFile), currentSeriesItem = the show

// Movie
const movieTitle = item.title || item.name;
// item = the real grid/card item (not movieFile)
```

`currentSeriesItem` must be in `startPlayback`'s `useCallback` dependency array — it was missing once (stale-closure bug: the label-building code read a stale/null `currentSeriesItem` because the memoized callback never re-created when it changed).

Same pattern applies to the **download filename** on the backend side — see stalker-m3u-server's download handler, which had the identical bug (using the upstream portal's own `Content-Disposition` filename instead of a computed one) in four separate code branches.

---

## Navigation flicker: two distinct race conditions, same symptom

Symptom reported: browsing into a season/category briefly flashes "No content found" (or the wrong page entirely) before showing real data — or a page navigated away from (e.g. via Continue Watching → play → back) stays permanently empty until an unrelated click happens to trigger a refetch.

### 1. `useMediaLibrary.ts`'s `fetchData` — context set too late

`MainContentGrid` decides *which* page to render (season list vs. episode list, etc.) based on `context` fields (`seasonId`, `movieId`). `fetchData` used to call `setContext(newContext)` only **after** the network response resolved, while `setLoading(true)`/`setItems([])` fired immediately. For the whole fetch duration, the component tree kept rendering logic for the *previous* context against the *new* empty/loading state — flashing the wrong view.

**Fix**: `setContext(newContext)` now fires synchronously alongside the other resets, at the top of `fetchData`, for all three content-type branches (movie/series/tv) — not just the one that happened to be reported first. If you add a new content-type branch, set context early there too.

### 2. `useAppNavigation.ts`'s `restorePreviousFrame` — trusting empty placeholder frames

`playContinueWatching()` jumps straight from a Continue Watching card to playback, pushing history frames (`homeState`, `seasonState`) for "back" to land on — but those frames' `items` are `[]`, because nothing ever actually fetched them (playback resolution bypasses the browsing grid entirely). Going back restored that empty array directly, and the `isRestoringFromHistory` guard blocked any fetch for 500ms with nothing re-triggering afterward — the page was stuck empty until an unrelated click happened to call `fetchData`.

**Fix**: `restorePreviousFrame` now only trusts a history frame's cached `items` if `items.length > 0` (real, previously-loaded data — restore instantly, no refetch, same as before). An empty frame triggers a real `fetchData(previousFrame.context)` instead of restoring the empty placeholder as-is.

**General principle for any future "jump straight to X, push a frame for back" flow**: either populate the pushed frame's `items` for real, or make sure whatever restores it treats an empty frame as "needs fetching," not as "confirmed empty."

### 3. `useMediaLibrary.ts`'s `fetchData` — no request-sequencing guard (out-of-order responses)

Reported symptom: clicking a category shows the *previous* category's content (e.g. "4K English" briefly/persistently showing "4K Hindi" titles) — user described it as happening "on fast switching." `fetchData` had zero protection against out-of-order network responses: switching categories fires a new async call without cancelling or superseding the previous one, so if an older request's response lands *after* a newer one, it silently overwrites the newer request's already-correct state.

**Fix**: `fetchRequestRef` (a monotonic counter) — every `fetchData` call stamps its own id at the top (`const requestId = ++fetchRequestRef.current`), and an `isStale()` check gates every `setItems`/`setTotalItemsCount`/`setChannelGroups`/error-state commit after each `await` boundary. Only the call whose id is still the current value of the ref by the time its response lands is allowed to touch state. The `finally` block's `setLoading(false)` is also gated — a stale request finishing late must not clear the *newer* request's loading state.

**Investigated but not confirmed as the root cause**: in the specific report that prompted this fix, the user later found the same wrong-category content appeared even on a single deliberate click (not fast switching) — which this guard does nothing for, since there's no race without overlapping requests. Network trace showed the same category request firing twice back-to-back (a separate, real bug — see stalker-m3u-server's `skill-xtream-provider.md`, "in-flight deduplication" — closed regardless since it's wasteful either way), but the wrong-category-content symptom itself was ultimately judged more likely a portal-side (upstream Stalker/Xtream) data issue than anything in this codebase. Keep this fix — it closes a real class of bug — but don't assume it was *the* fix for that specific report without further evidence.

---

## Key Files

- `src/hooks/useAppNavigation.ts` — `resolveStreamUrl`, `startPlayback`, `playContinueWatching`, `restorePreviousFrame`
- `src/hooks/useMediaLibrary.ts` — `fetchData`, `fetchRequestRef`
- `src/context/video/VideoContext.tsx` — player state, download/copy-link. Embedded-subtitle probing's `isProgressive` check used to extension-sniff `rawStreamUrl` — broken once stream URLs became opaque tokens (`/api/vod/play?t=...`, no real file extension). Fixed to check for the *absence* of the `&m3u8=1` tag instead (the same signal `VideoPlayerContent.tsx` uses to pick the player type) — no `m3u8` in the URL means progressive, which is the only case `ffprobe` can actually inspect for muxed subtitle tracks anyway (HLS segments aren't one seekable file). Two progress-save call sites (`saveProgress`, and the auto-advance-to-next-episode handler) also guard against persisting a blank `title` — a blank title renders as a literal `??` in `MediaCard`'s initials fallback; skip the save rather than persist it, since a later tick with the real title (once `item`/`seriesItem` metadata finishes loading) will upsert over it. Old rows saved with a blank title before this fix don't self-heal automatically — need a fresh resume or manual dismissal.
