# Portal-Native Browsing/Detail UI — Skill Reference

Covers the component layer that renders the portal-native (non-Discover, non-admin, non-auth) "main app" screens — `MainContentGrid.tsx` and everything it switches between (`MovieDetailPage.tsx`, `SeriesOverviewPage.tsx`, `SeasonEpisodesPage.tsx`, `ContinueWatching.tsx`), plus the shared card/row primitives (`MediaCard.tsx`, `EpisodeAccordionRow.tsx`, `MediaInfoHeader.tsx`). The DATA layer these components consume — `fetchData`, `context`, request-sequencing, history-frame stack, playback resolution — is `useAppNavigation.ts`/`useMediaLibrary.ts`, documented in `skill-video-playback.md`; read that first, this doc doesn't repeat it.

---

## `MainContentGrid.tsx` — which sub-page actually renders

Three booleans, computed inline right before the render (`MainContentGrid.tsx`, just above `viewKey`):

```ts
const isMovieDetail = contentType === 'movie' && !!detailItem;
const isSeriesOverview = contentType === 'series' && !!context.movieId && !context.seasonId && !!currentSeriesItem;
const isSeasonEpisodes = contentType === 'series' && !!context.movieId && !!context.seasonId && !!currentSeriesItem;
```

`detailItem` is separate app-level state (not part of `context`) that only ever drives the movie branch — `MovieDetailPage` doesn't come from `fetchData` at all, it's just whatever item `onPlayDetailItem`'s caller last set. Series drill-down, by contrast, is entirely `context`-keyed (`movieId`/`seasonId`), per `skill-video-playback.md`'s synchronous-`setContext` fix — these two branches are structurally different mechanisms that happen to look like siblings here.

**`isSeasonEpisodes`/`SeasonEpisodesPage` is confirmed dead in the current UI** (verified by tracing every setter, not just hedged): `SeriesOverviewPage`'s `SeriesOverviewPageProps` declares `onSelectSeason`/`onBack` but the component never destructures or calls either — season tabs are wired to local `setSelectedSeasonId(season.id)` only. The only other place in `src/` that sets `context.seasonId` via `fetchData` is `useAppNavigation.ts`'s `handleItemClick`, in the `item.is_season` branch — but that branch can never actually fire: `context.movieId` and `currentSeriesItem` are always set **synchronously together**, both in `handleItemClick`'s own series-click branch and in Discover's equivalent (`useDiscoverNavigation.ts`), and every history-frame restore (`useNavigationHistory.ts`'s `applyFrame`) restores both together too. That means there is no reachable state where `contentType === 'series' && context.movieId` is true with `currentSeriesItem` still null while a season tile is on screen to click — `isSeriesOverview` always wins first. The data layer (`useMediaLibrary.ts`) still supports a `seasonId`+`movieId` fetch, so the plumbing exists end-to-end, it's just orphaned — leftover scaffolding from before the season tabs were inlined into `SeriesOverviewPage`. Safe to delete `SeasonEpisodesPage.tsx`/`isSeasonEpisodes`/the `onSelectSeason` prop once someone's ready to commit to that, but check this doc's own reasoning still holds (re-grep for `context.seasonId` setters and `item.is_season`) if either `handleItemClick` or `SeriesOverviewPage`'s season-selection wiring changes before then.

---

## `SeriesOverviewPage.tsx` — season tabs really do bypass `fetchData`

Confirmed: `useEffect` on `[selectedSeasonId, seriesItem.id]` calls `getSeries({ movieId, seasonId, page: 1, pageAtaTime: 1 })` directly — no `fetchData`, no `context` mutation, no `fetchRequestRef`. Because `context.seasonId` is never set by this path, the fetched episodes carry no season tag from context; the code stamps `season_id: selectedSeasonId` onto each episode object itself (`withSeason`) specifically so `startPlayback`'s episode branch — which reads `seasonId` off the item first, per its own fallback order — still resolves the right season's stream when Play is clicked.

**Its own request-sequencing guard is weaker than `useMediaLibrary`'s, not absent, but has a real gap**: a `cancelled` closure flag (standard `useEffect` cleanup pattern) protects the season-switch effect itself — switching season tabs fast cancels the previous effect's `.then()` before it can commit stale episodes over the new tab's. That covers the "switch tabs fast" case skill-video-playback.md's `fetchRequestRef` was built for. What it does *not* cover: `loadMoreEpisodes` (the pagination path, triggered by the `IntersectionObserver` sentinel) has no `cancelled`-equivalent tied to season switching — only `loadingMoreRef` guarding against a second concurrent load-more call for the *same* season. If a season switch happens while a load-more request for the *previous* season is still in flight, that response's `setEpisodes((prev) => [...prev, ...withSeason])` will append the old season's next page onto the new season's already-loaded list, since `prev` is read at commit time with no season identity check. This is a real, unaddressed gap — not verified as ever reported/observed in production, but the code has no guard against it.

Both `getSeries()` calls in this file (the season-switch fetch and `loadMoreEpisodes`) **must** pass `category` (`seriesItem.category_id ? String(seriesItem.category_id) : '*'`), matching what `useMediaLibrary.ts`'s equivalent call always sends — this was dropped when the inline fetch was written, and its absence produced empty results from the API (symptom: "No episodes found for this season" on every season, not just some). If you add a third `getSeries` call site in this file, carry the same param or you'll reintroduce that bug.

Season tabs default to `seasons[0]` once `seasons` loads (`useEffect` on `[seasons, selectedSeasonId]`, one-shot via the `!selectedSeasonId` guard) — so a series with seasons opens straight to season 1's episodes with no extra click, matching the old dedicated season-page flow's landing behavior.

`seasonLabelFor()` prefers the season item's own structured `number` field, falling back to an **anchored** digit-match (`/^\D*(\d+)/`, i.e. "the first run of digits at the start of the string, skipping only non-digit lead-in") against `title`/`name` only if `number` is absent — never trusting either verbatim, because some providers bake the series name into every season's title (e.g. `"Season 1. The Apartment Job - Hindi"`). **This used to be an unanchored `raw.match(/\d+/)?.[0]`** — matching the *first* digit run anywhere in the string — which broke badly for providers whose season title/name carries an unrelated number before the season number (e.g. a `"...(1080)"` quality tag): every season on the tab strip showed the same wrong number (`"Season 1080"`, repeated for all of them) because they all matched the same substring. If you ever see a repeated identical season number across every tab again, this regex is the first place to check — and check whether `number` is actually being populated by the API before assuming the regex needs more anchoring.

---

## Known issue, unfixed: absolute `screenshot_uri` values bypass the image proxy

Every image-rendering site in the app (`MediaCard.tsx`, `TvChannelListCard.tsx`, `EpisodeCard.tsx`, `EpisodeAccordionRow.tsx`, `MediaInfoHeader.tsx`, `SeriesOverviewPage.tsx`'s season tiles, `TVControls.tsx`, `SeasonEpisodesPage.tsx`, `VariantPickerModal.tsx` — ~10 components, same pattern in each) does `item.screenshot_uri.startsWith('http') ? item.screenshot_uri : \`${baseUrl}/api/images${item.screenshot_uri}\``. When the backend hands back an already-absolute URL (some providers' `screenshot_uri` is a full `http://...` path, not a relative one), the app uses it **directly** — no proxying, no rewriting. For providers whose screenshots live on plain HTTP (not HTTPS) hosts, this is visibly a real upstream provider domain and URL structure, inspectable by anyone via view-source/inspect-element — confirmed via a real report: `http://new.jiotv.de/stalker_portal/screenshots/...` URLs showing up directly in the DOM, plus browser "Mixed Content" warnings (HTTP images on an HTTPS page) in the console. This is a real, if minor, information-disclosure surface (upstream domain/pathing exposed to the client), not fixed as of this writing — deliberately left alone since it's a cross-cutting change (~10 files) with a real tradeoff (proxying every absolute image URL adds a request hop + server bandwidth for every poster/screenshot in the app), not a one-line patch. If tackled, the natural fix point is server-side (normalize `screenshot_uri` to always be relative/proxied for every provider, not just some) rather than patching all ~10 frontend call sites individually.

---

## `MediaCard.tsx` — fallback/edge-case surface

Beyond the initials fallback (`displayTitle.substring(0,2).toUpperCase()`, `'??'` for a blank title — see `skill-video-playback.md`'s note on why a blank-title progress record is worth skipping rather than saving):

- **Poster and backdrop fail independently**: `imageError`/`backdropError` are two separate `useState`s, each reset only when its own source URL (`screenshot_uri`/`backdrop_path`) changes — a poster load failure doesn't touch the backdrop layer or vice versa. Both flip on the image's own `onError`.
- **Backdrop is lazy-gated by the same `IntersectionObserver`/`isVisible` flag as the poster** (`showBackdrop = isVisible && backdropUrl && !backdropError`) — an off-screen card never fetches either image regardless of ambient-backdrop intent, since the observer disconnects itself after the first intersection (one-shot, not a continuous visibility tracker).
- When there's no backdrop, the initials tile gets a `bg-gradient-to-br from-white/10` treatment instead of sitting on bare black — a genuinely blank card (no poster, no backdrop) still needs some visual texture, not just a flat fill.
- `isLoading` (Discover's "resolving this click" spinner overlay, documented in `skill-discover.md`) also gates the click handler itself (`if (isLoading) return`) — not just the visual overlay. Without that guard a fast second click during resolution would fire a second `onClick(item)` for the same card.

---

## `ContinueWatching.tsx` — refresh is entirely caller-driven, not self-fetching

Confirmed: this component takes `progressRecords` as a prop and never calls `getUserProgress()` for its main list — it reads directly off the app-level cache passed down from `useMediaLibrary`, and `inProgressItems` is a pure `useMemo` derivation with no fetch effect at all. So "refresh" here doesn't mean "this component refetches" — it means "the parent (`MainContentGrid`, ultimately `useMediaLibrary`) re-renders it with new `progressRecords`." `cwRefreshKey`/`setCwRefreshKey` (threaded down through `MainContentGrid`'s props, incremented via `onProgressChanged`) lives one level up specifically to force that parent-level reload; nothing about the increment happens inside `ContinueWatching.tsx` itself.

The one thing this component *does* fetch on its own is `handleDismiss`: clicking the per-card × button calls `deleteUserProgress(targetId)`, then does a full `getUserProgress()` re-fetch just to walk every record looking for others that reference `targetId` as their `mediaId`/`itemId`/`id` (a season/episode's progress row can point back at a parent series id) and deletes those too, before calling `onProgressChanged?.()` to trigger the parent-level refresh described above. This is a real N+1-shaped operation (one list fetch + one delete per matching record) but it only runs on an explicit dismiss click, not on any render path.

`series_name`/`series_name_alt` are built as fields separate from the composite `title`/`name` (which already has `" – EpisodeTitle"` appended) specifically so a second play-from-Continue-Watching doesn't re-derive `currentSeriesItem`'s name from the already-composed display string — that would compound the quality-descriptor suffix on every subsequent resume. See the inline comment at `ContinueWatching.tsx:75-83` if touching this.

---

## `MediaInfoHeader.tsx` — shared card, asymmetric consumers

Both `MovieDetailPage` and `SeriesOverviewPage` render through this one component (`onPlay`/`trailerKey`/`metaExtra`/`children` props), but they use different subsets: `MovieDetailPage` passes only `onPlay`; `SeriesOverviewPage` passes `trailerKey` and `metaExtra` (season count chip) but no `onPlay` — a series has no single "play" action at the overview level, only per-episode play buttons rendered inside `children` (the Seasons section). The Play/Trailer button block is conditionally rendered as a pair (`(onPlay || trailerKey) && (...)`), and `data-default-focus` shifts from the Play button to the Trailer button when `onPlay` is absent — so the TV-remote default focus target correctly follows whichever primary action a given consumer actually offers, without either consumer needing to know about the other's layout.

`SeasonEpisodesPage.tsx` does **not** use `MediaInfoHeader` — it has its own smaller inline header (backdrop + poster + series/season title only, no rating/genre/cast/trailer block). Since `SeasonEpisodesPage` is confirmed dead (see above), this is a second header implementation with different visual weight that nothing currently reaches — worth deleting alongside the rest of that page rather than leaving it to drift.

---

## Layout/state coupling worth flagging

- **`contentScrollRef` scroll-reset effect** (`MainContentGrid.tsx`) depends on `[detailItem, context.movieId, context.seasonId]` — it does *not* include `context.category` or `context.search`. Switching categories or submitting a search re-scrolls only if that action also happens to change `movieId`/`seasonId` (it doesn't). This looks intentional (category/search changes go through the normal grid, no "back button position" concern), but if you ever add a detail-page-like view keyed on some other `context` field, remember to add it here too or the scroll-to-top silently won't fire for it.
- **`viewKey`** (`MainContentGrid.tsx`) is deliberately built from `context` fields only (`contentType`, `category`, `movieId`, `seasonId`, `search`) — not from `detailItem`. Opening a movie detail page doesn't remount the wrapper (no `content-transition` replay) the way drilling into a series does, because `detailItem` toggling alone doesn't change any `viewKey` input. This is consistent with `isMovieDetail` being an orthogonal mechanism from the `context`-driven series branches (see above), but it means the two "detail-like" views animate differently on entry — not a bug, just asymmetric by construction.
- **`enrichedItems`** (episode metadata inheriting from `currentSeriesItem` when missing) only applies to the flat `isEpisodeList` grid path in `MainContentGrid` itself — `SeriesOverviewPage`'s inline episode list (`episodes` state, fetched directly via `getSeries`) does **not** go through this enrichment, since it never flows through `MainContentGrid`'s `items`/`enrichedItems` at all. An episode missing `description`/`actors`/etc. in the season-tabs view won't get backfilled from the series the way the same episode would if reached via `SeasonEpisodesPage` — which is moot in practice since that path is confirmed unreachable (see above), but worth knowing if `SeriesOverviewPage`'s bypass is ever reworked to flow back through `MainContentGrid`.

---

## Folder reorg + `MainContentGrid`'s own internal split

`src/components/organisms/` was reorganized from one flat 40-file directory into domain subfolders — everything covered by this doc now lives under `organisms/browse/` (`MainContentGrid.tsx`, `MovieDetailPage.tsx`, `SeriesOverviewPage.tsx`, `SeasonEpisodesPage.tsx`, `ContinueWatching.tsx`, `WelcomeCarousel.tsx`), while `MediaInfoHeader.tsx`/`TVControls.tsx`/`VODControls.tsx` moved to `organisms/video/`. Category/discover pieces (`CategorySelector.tsx`, `DiscoverView.tsx`) are under `organisms/discover/`; admin under `organisms/admin/`; channels under `organisms/channels/`; header/topbar/error-boundary under `organisms/layout/`. If a path below looks wrong relative to an older mental model, this reorg is why — the component names and behavior didn't change, only their folder.

`MainContentGrid.tsx` itself was also split (it had grown past 450 lines): the JSX-only pieces now live in `organisms/browse/main-content-grid/` — `MediaGrid.tsx` (the actual card grid — TV/episode/movie card branching), `GridFooter.tsx` (empty-state + pagination retry), `CategorySidebar.tsx` (desktop sidebar + resize handle), and `MobileCategoryDrawer.tsx`. `MainContentGrid.tsx` remains the orchestrator — it still owns all the state/effects described in this doc (`contentScrollRef`, `viewKey`, `enrichedItems`, the sub-page branching booleans); only the render output was extracted into these four presentational components, wired via straightforward props with no behavior change.

---

## Key Files

- `src/components/organisms/browse/MainContentGrid.tsx` — sub-page branching (`isMovieDetail`/`isSeriesOverview`/`isSeasonEpisodes`), category sidebar shell, `viewKey`/scroll-reset
- `src/components/organisms/browse/main-content-grid/MediaGrid.tsx`/`GridFooter.tsx`/`CategorySidebar.tsx`/`MobileCategoryDrawer.tsx` — presentational pieces extracted from `MainContentGrid.tsx`, no state of their own
- `src/components/organisms/browse/MovieDetailPage.tsx` — thin wrapper over `MediaInfoHeader`
- `src/components/organisms/browse/SeriesOverviewPage.tsx` — season tabs + inline episode list, its own `getSeries` fetch bypassing `fetchData`
- `src/components/organisms/browse/SeasonEpisodesPage.tsx` — dedicated season/episode page, gated on `context.seasonId`; **confirmed unreachable** given `SeriesOverviewPage`'s inline tabs and `handleItemClick`'s `item.is_season` branch never firing (see above) — a deletion candidate, not live code
- `src/components/organisms/browse/ContinueWatching.tsx` — pure `progressRecords` consumer, no self-fetch except `handleDismiss`'s cascade delete
- `src/components/molecules/MediaCard.tsx` — shared grid card, initials/backdrop/poster fallback chain, `isLoading` overlay+click-guard
- `src/components/molecules/EpisodeAccordionRow.tsx` — episode row used by both `SeriesOverviewPage` and `SeasonEpisodesPage`
- `src/components/organisms/video/MediaInfoHeader.tsx` — shared poster/meta/trailer card used by `MovieDetailPage` and `SeriesOverviewPage` (not `SeasonEpisodesPage`)
</content>
