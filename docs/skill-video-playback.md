# Video Playback & Navigation — Skill Reference

Covers `useAppNavigation.ts` and `useMediaLibrary.ts` — how browsing (movies/series/live TV grids, season/episode drill-down) and playback URL resolution work, plus several real bugs fixed in this area. Backend counterpart: portalcast-server's `skill-stream-tokens.md`.

---

## The backend always hands back a ready-to-use URL now

Since the backend moved to opaque stream tokens (see portalcast-server's `skill-stream-tokens.md`), **every stream URL the frontend receives is already fully routed through the backend** — `/live.m3u8?t=...`, `/api/proxy?t=...`. There is nothing left for the client to wrap, encode, or resolve further.

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

Same pattern applies to the **download filename** on the backend side — see portalcast-server's download handler, which had the identical bug (using the upstream portal's own `Content-Disposition` filename instead of a computed one) in four separate code branches.

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

**Investigated but not confirmed as the root cause**: in the specific report that prompted this fix, the user later found the same wrong-category content appeared even on a single deliberate click (not fast switching) — which this guard does nothing for, since there's no race without overlapping requests. Network trace showed the same category request firing twice back-to-back (a separate, real bug — see portalcast-server's `skill-xtream-provider.md`, "in-flight deduplication" — closed regardless since it's wasteful either way), but the wrong-category-content symptom itself was ultimately judged more likely a portal-side (upstream Stalker/Xtream) data issue than anything in this codebase. Keep this fix — it closes a real class of bug — but don't assume it was *the* fix for that specific report without further evidence.

### 4. `useNavigationHistory.ts`'s `applyFrame` — Discover frames were treated as empty grid placeholders

Discover never populates `useMediaLibrary`'s `items`/`context` state — it owns its own rows via `useDiscover()`/`DiscoverView.tsx` locally, entirely separate from the grid. That means **every** history frame pushed while Discover was showing has `frame.items.length === 0` (nothing was ever fetched into that field for it), so `applyFrame`'s "empty placeholder, needs a real fetch" branch fired unconditionally on every single Back press landing back on Discover — calling `fetchData(frame.context)` with a stale/irrelevant context (root context, wrong `contentType` left over from `handleContentTypeChangeRaw('series'/'movie')` inside `openDiscoverItem`, which is never reverted). This produced a spurious refetch-and-render cascade on every Discover Back press.

**Fix**: the empty-placeholder refetch branch now checks `!frame.showDiscover` first — a Discover frame is never treated as "needs fetching," since there was never anything to fetch into `items` for it in the first place. Symptom before the fix: this alone wasn't the actual crash (see `skill-discover.md`'s error #185 section for the real trigger), but it was a real, always-firing wasted refetch on the exact same navigation path, worth fixing regardless.

---

## Key Files

- `src/hooks/useAppNavigation.ts` — `startPlayback`, `playContinueWatching`, `handleItemClick`. History-frame stack (`pushFrame`/`popHistoryFrame`/`redoNextFrame`/`restorePreviousFrame`/`handleBack`) now lives in `src/hooks/useNavigationHistory.ts`; `resolveStreamUrl` is its own module at `src/hooks/resolveStreamUrl.ts`.
- `src/hooks/useMediaLibrary.ts` — `fetchData`, `fetchRequestRef`. The silent artwork-refresh interval is `src/hooks/useLibraryBackgroundRefresh.ts`; the fill-viewport/scroll-listener "load more" pair is `src/hooks/useInfiniteScroll.ts`.
- `src/components/organisms/video/VideoPlayerContent.tsx` — the actual `<MediaPlayer>` render tree. `VideoPlayer.tsx` (the route-level entry point) is `React.lazy`-loaded from `App.tsx` — only fetched once playback actually starts, not on initial app load. TV remote nav is `src/components/organisms/video/hooks/useTVRemoteNavigation.ts`; touch gestures are `useTouchGestures.ts` in the same folder.
- `src/components/organisms/channels/TvChannelList.tsx` — the channel-switch overlay `VideoPlayerContent.tsx` shows on the TV remote's channel-list key; its groups/channels two-column nav state machine (persisted-selection restore, filtered-channels derivation, keydown handling) is `src/hooks/useChannelListNav.ts`.
- `src/context/video/VideoContext.tsx` — orchestration + the memoized context value only now (see split below). Two progress-save call sites (`saveProgress`, and the auto-advance-to-next-episode handler, both now in `useProgressTracking.ts`) guard against persisting a blank `title` — a blank title renders as a literal `??` in `MediaCard`'s initials fallback; skip the save rather than persist it, since a later tick with the real title (once `item`/`seriesItem` metadata finishes loading) will upsert over it. Old rows saved with a blank title before this fix don't self-heal automatically — need a fresh resume or manual dismissal. `saveProgress` also stamps a `catalogId` (Discover's `ContentMeta` id, e.g. `movie_123`) onto the progress record when the item carries one — `mediaId`/`itemId` are portal-file ids, not valid `ContentMeta` lookup keys, and without `catalogId` the "Because You Watched X" recommendation row silently came back with `basedOnTitle: null` for anything opened via Discover.

### The monolithic VideoContext has been split into focused hooks

`VideoContext.tsx` used to own all player state directly. It's now a thin composition root over eight extracted hooks in `src/context/video/`, each a self-contained slice with its own inputs/outputs wired back in via `VideoProvider`:

- **`useEpgSync.ts`** — current/next EPG program + progress bar percentage for live TV, polled every 10s. Pure function of `contentType`/`channelInfo`/`epgData`, owns no refs anything else depends on.
- **`useHlsRecovery.ts`** — the hls.js error-recovery/retry state machine (`retryCount`, `reloadTrigger`, `isRecovering`, `streamError`, `handleError`, `onProviderChange`). This is where the "channel keeps reconnecting" logic lives now: vidstack only auto-recovers fatal *media* errors itself, so fatal *network* errors reach `handleError` with zero built-in recovery attempt — this hook tries hls.js's own in-place `startLoad()`/`recoverMediaError()` first and only falls back to a full player remount (bumping `reloadTrigger`, which re-fetches the manifest as a brand-new session) as a last resort. Non-fatal hls.js errors are ignored entirely — acting on them here would race hls.js's own internal per-fragment/level retry.
- **`useSubtitles.ts`** — embedded-track probing (progressive VOD only), online subtitle search, and manual `.srt`/`.vtt` add. **This is where the old skill doc's "embedded-subtitle probing" section actually lives now** — it used to be inline in `VideoContext.tsx`. The `isProgressive` check still works the same way: it doesn't extension-sniff `rawStreamUrl` (broken once stream URLs became opaque tokens like `/api/vod/play?t=...`, no real file extension) but instead checks for the *absence* of the `&m3u8=1`/`m3u8` tag — same signal `VideoPlayerContent.tsx` uses to pick HLS vs. progressive playback. No `m3u8` in the URL means progressive, the only case `ffprobe` can actually inspect for muxed subtitle tracks (HLS segments aren't one seekable file).
- **`useVideoSeek.ts`** — the "hold skip button to accelerate seek distance" behavior (`SEEK_LEVELS = [10, 30, 60, 180]` seconds, escalating the longer you hold) and its on-screen overlay. Needs `showControlsAndCursor`/`setControlsVisible` passed in from the parent since controls-visibility state is still owned by `VideoContext.tsx` itself.
- **`useCasting.ts`** — the "cast to device" action (`handleCast`). Thin — just builds the payload and calls the `castTo` prop threaded down from wherever the receiver list actually lives (see `SocketContext`/`useSocket`'s `activeDevices`).
- **`useEpisodeLookup.ts`** — memoized (`useMemo` keyed on `[episodes, item]`) current-episode index + a `Map<episodeNum, episode>` for O(1) next/prev-by-number lookups, plus `resolveAdjacentEpisode()` (number-based lookup first, falling back to list-direction index — same fallback order the old inline code used). Replaces what used to be 4 separate copies of an O(n) `findIndex`/`find` scan (in `completePlayback`/`handleEnded`/`playNextEpisode`/`playPrevEpisode`), each redoing the same work independently.
- **`useProgressTracking.ts`** — `saveProgress`, `handleTimeUpdate`, `completePlayback`, `handleEnded`, `playNextEpisode`, `playPrevEpisode`, the periodic/unload progress-save effect, and the `hasRestoredProgress`/`hasCompletedPlayback` refs. All consume `useEpisodeLookup` for next/prev resolution. This is the one hook that owns most of the actual playback-completion business logic — if you're hunting for the blank-title guard or the `catalogId` stamping, it's here now, not in `VideoContext.tsx`.
- **`useDownloadActions.ts`** — copy-link (`handleCopyLink`) and download (`handleDownload`, including the `<Series> S{season}E{episode}` filename computation) handlers.

Why split at all: each slice's inputs/outputs are narrow enough to reason about independently, and `VideoContext.tsx` was large enough that adding more interdependent state to it directly risked the same kind of effect-ordering bugs already documented in `useMediaLibrary.ts`/`useDiscover.ts` (see `skill-discover.md`'s note on why Discover state lives in its own hook rather than being folded into `useMediaLibrary`). If you're hunting for a specific piece of player behavior and it's not in `VideoContext.tsx` directly, check these eight files before assuming it's missing.

### `VideoPlayerContent.tsx` has also been split — the TV remote nav ref pattern

`VideoPlayerContent.tsx` renders the actual `<MediaPlayer>` tree and used to own the TV remote/keyboard handling and touch-gesture handling inline. Both are now hooks in `src/components/organisms/video/hooks/` (nested under the video component folder, separate from the `.tsx` components themselves):

- **`useTVRemoteNavigation.ts`** — owns `navRef`, a synchronous ref mirror of `isSettingsOpen`/`isControlsVisible`/`isEpisodeListOpen` (kept in sync by three small effects), `getVisibleFocusableElements()` (DOM query + `getBoundingClientRect` filtering — expensive, called from three different places: the keydown handler and two focus-management effects), and the actual keydown handler itself. `navRef` exists specifically so the keydown listener always reads current state without re-binding the listener on every render — **if you split this hook further, `navRef` and its three sync effects have to move with the keydown handler**, not stay behind; the handler reading a stale ref is how you silently reintroduce the "TV remote gets stuck after fast clicks" bug this pattern was built to fix.
- **`useTouchGestures.ts`** — long-press-for-2x-speed and single/double-tap zone handling on the gesture overlay div. Independent of the above (pointer input, not keyboard/remote) — no shared state beyond both pulling from `VideoContext`.

Both hooks call `useVideoContext()` themselves rather than being passed 20 individual props — same pattern as `VideoContext.tsx`'s own sub-hooks not being worth threading everything through manually.

### `VideoPlayerContent.tsx`'s own `stalled`-recovery listener needs a cooldown — it's a separate mechanism from `useHlsRecovery`

Distinct from the `hlsError`/`handleError` recovery machinery in `useHlsRecovery.ts` above: `VideoPlayerContent.tsx` also attaches its own native `pause`/`stalled` DOM listeners directly to the player element (a "TV Browser unexpected pause/stall recovery" nudge, unrelated to hls.js's own error events). `handlePause` was already guarded with a 1000ms `setTimeout` before calling `player.play()`; `handleStalled` was not — it called `player.play()` synchronously on every single native `stalled` event with **zero debounce**.

The native `stalled` event fires repeatedly (many times a second) whenever the browser wants media data and isn't getting it fast enough — exactly the condition during real network trouble. Each undebounced nudge immediately re-triggers a fetch of the current manifest/fragment at the same token/URL, which stalls again almost instantly, firing `stalled` again — a tight loop bounded only by network round-trip time. Confirmed via production server logs: the client hit `/live.m3u8?t=...` with the *same* token roughly every 7-10ms, hundreds of times in a fraction of a second, which alone was enough to trip the backend's per-IP rate limiter (see portalcast-server's rate-limit docs) and 429 every other stream request from that client too — the reported symptom was "can't play anything, even live TV," not just the one channel that actually stalled.

**Fix**: a `lastStallNudge` timestamp (plain closure variable, reset per-effect-run — doesn't need to be a ref since the listener itself is torn down/recreated by the same effect) gates `handleStalled` to at most one `player.play()` call per 3 seconds. Still recovers a genuine one-off stall; can no longer spiral into a retry storm. If you add another native media-event listener here that can call `play()`/reload the source, give it the same kind of cooldown by default — an undebounced listener on any event that itself fires *because of* degraded network conditions is the same trap.

**Gotcha if you touch the memoized context value**: `VideoContext.tsx`'s `value = useMemo(...)` still lists every field individually in both the object and the deps array (not spread from the sub-hooks' return objects) — if you add a new field to `useEpgSync`/`useHlsRecovery`/etc.'s return value and want it exposed on the context, you must add it to *both* places in `VideoContext.tsx` or it'll silently be `undefined` to consumers despite existing in the hook's own return value.
