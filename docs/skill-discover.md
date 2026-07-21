# Discover / Recommendations — Skill Reference

Covers the "Discover" browsing surface — `useDiscover.ts`, `DiscoverView.tsx`, `DiscoverFilters.tsx`, `RecommendedRow.tsx`, `MediaCardRow.tsx`, `AmbientBackdrop.tsx`, `VariantPickerModal.tsx`, and the `discover.ts` endpoint file. Backend counterpart: portalcast-server's Discover/`ContentMeta` service (facets/browse/recommendations/variants, TMDB-enriched catalog).

---

## What Discover actually is

A separate, TMDB-metadata-driven browsing surface layered on top of the existing portal-native Movies/Series grids (`MainContentGrid.tsx`/`useMediaLibrary.ts`) — not a replacement for them. It reads from the backend's own `ContentMeta` catalog (ids prefixed `movie_`/`series_`) rather than the raw per-category portal listings, which is why its items need to be resolved through a translation step (`openDiscoverItem` in `src/hooks/useDiscoverNavigation.ts`) before they can be played or shown on a detail page — see below.

`useDiscover.ts` is a sibling to `useMediaLibrary.ts`, not folded into it: Discover's facets/browse/recommendations state is a genuinely separate concern, and `useMediaLibrary.ts` is already large enough that adding more interdependent state risks the same class of effect-ordering bugs documented there (`restoredForRef`, `fetchRequestRef`).

---

## Discover items are not playable directly — `openDiscoverItem` in `useDiscoverNavigation.ts`

Discover cards carry `ContentMeta`'s prefixed id (`movie_123`/`series_456`) and none of the `is_series`/`is_playable_movie` flags the rest of the app's click-handling (`handleItemClick`) relies on — those flags encode the portal-native "is this a category tile or an actual movie" browsing model, which Discover has no equivalent of.

So Discover items are never fed into `handleItemClick` directly. Instead `openDiscoverItem` (in `src/hooks/useDiscoverNavigation.ts` — this whole translation layer used to live inline in `App.tsx`, pulled out into its own hook alongside `handleDiscoverItemClick`/`onSelectVariant`/`handleCarouselAction`; `App.tsx` now just wires it up) resolves them the same way `handleCarouselAction` already resolves carousel slides: strip the `movie_`/`series_` prefix to get the real portal id, call `getMedia`/`getSeries` with the category **Discover's own item already carries** (`item.category`, enriched server-side — see `discover/index.ts`'s `toMediaItem`), then open the detail page directly.

Traps this code works around, in order — don't re-simplify without checking these first:

1. **`getSeries()`'s `res.data[0]` is a season, not the series.** For series, `res.data` is the season list — `res.data[0]` is literally the first season object (`id="32537"`, `name="Season 2..."`, `is_season: true`). Spreading it as if it were the series produces a garbled title and, worse, a wrong id (the season's) that every subsequent lookup inherits. `currentSeriesItem` is built from Discover's own already-correct `item` instead of anything in the `getSeries` response.
2. **The resolved movie file's own title/name is often just a quality descriptor** (e.g. "Punjabi / Ultra high quality (4K)") — same trap documented in `skill-video-playback.md` for `resolveStreamUrl`. `realTitle` is taken from Discover's `item` and re-applied after spreading `res.data[0]` on top.
3. **The resolved file's `category_id` can be for a different, unrelated category than the one that actually worked.** Confirmed via real traffic: a movie fetched successfully via `category=1` came back with `category_id="4"`; re-querying with that `4` (which the play step's `getMedia` lookup prefers) failed outright. `resolveCategory` (the category that's *known* to have worked, from Discover's own item) is stamped on afterward, overriding whatever the file object reports.
4. **`handleContentTypeChangeRaw` only takes effect next render** — `fetchData` closes over its own memoized `contentType`, so the type override must be passed explicitly as `fetchData`'s second/context arg rather than relying on the just-triggered state update.

`openDiscoverItem` deliberately does **not** call `setShowDiscover(false)` — `MainContentGrid` renders as an absolutely-positioned overlay on top of Discover (`showDiscover ? 'absolute inset-0 z-40 ...' : 'h-full'` in `App.tsx`) instead of replacing it. Backing out clears `detailItem`/`currentSeriesItem`, dropping the overlay and revealing Discover's rows again, untouched and without a refetch.

---

## Variant picker — one Discover card, multiple underlying catalog entries

A single Discover card can represent more than one actual playable entry — the same title dubbed/subtitled differently (e.g. "ABC Tamil" vs. "ABC South Dub", where "South Dub" server-side quirkily means Hindi audio — see `discover.ts`'s `DiscoverVariant.variantLabel` comment). `handleDiscoverItemClick` (`useDiscoverNavigation.ts`) always calls `getDiscoverVariants(item.id)` first; if it resolves to more than one variant, `VariantPickerModal` opens instead of jumping straight to `openDiscoverItem`. If the variants call itself fails, it's swallowed and the item opens directly (degrade to old single-item behavior rather than block the click).

`pushFrame()` is called **before** opening the picker (capturing pre-picker state) so backing out of an open picker has something real to land on. When a variant is actually selected, `setVariantPickerItem/Options(null/[])` are cleared **after** `pushFrame()` inside `openDiscoverItem`, not before — the pushed frame needs to still show the picker as open, so that Back from the just-opened detail page reopens the picker rather than skipping past it to whatever was active before the picker ever showed.

---

## `useDiscover.ts` — row loading

- **`fetchGenreRows`** fetches each of the top genres independently (capped to `GENRE_FETCH_CONCURRENCY = 2` concurrent requests, not `Promise.all`-ed all at once) and merges each into `genreRows` as soon as it resolves — rows appear progressively instead of all waiting on the slowest one. The concurrency cap specifically exists because opening Discover previously fired ~11 concurrent queries (facets' 4 sub-queries + What's New + up to 6 genres) against the backend's sqlite3 driver, which shares Node's libuv threadpool (default size 4) with every other async I/O op on the process — enough to saturate the pool and stall unrelated requests, **including active stream playback**, until they cleared.
- **Recommendations are not paginated server-side** (`RECOMMENDATIONS` has no `page` param) — `DiscoverView.tsx` caps the row client-side to `RECOMMENDED_ROW_LIMIT = 14` since it's the only row that can't grow via scroll/arrow the way What's New and genre rows do.
- Load-more callbacks (`loadMoreWhatsNew`, `loadMoreGenreRow`) read current `page`/`hasMore`/`loadingMore` via mirrored refs (`whatsNewRef`, `genreRowsRef`) rather than the state directly, so they can stay referentially stable (empty deps) for use from a scroll handler/arrow click without stale-closure issues.
- `DiscoverView.tsx`'s own `filteredRequestRef` guards the filter-driven grid the same way `useMediaLibrary.ts`'s `fetchRequestRef` guards the main grid — a slower response for a filter/page the user has already moved past must not overwrite a faster later one, and a double "scroll near bottom" firing two load-more calls must not append the same page twice (`handleLoadMore` also short-circuits on `loadingFiltered`).

---

## `MediaCardRow.tsx` — infinite-scroll row mechanics

The horizontal strip hides its scrollbar (`hide-scrollbar`), so the left/right chevron buttons are the only on-screen affordance that it scrolls at all — they self-hide at each exhausted end rather than always showing. `canScrollRight` stays `true` whenever `hasMore` is true even if the strip's visual end is currently reached, specifically so the arrow doesn't look like a dead end while more pages are still loadable — scrolling near the right edge (within `NEAR_END_PX = 400`) or clicking the right arrow at the true end both trigger `onLoadMore`. Clicking the right arrow at the true end needs an explicit `setTimeout(updateScrollButtons, 350)` because that click doesn't fire a native `scroll` event (nothing left to scroll to before the new items are appended) — without it, a second click would be needed after the fetch resolves.

---

## React error #185 ("Maximum update depth exceeded") on Discover → detail → Back — two independent cascades, same underlying trap

Reported symptom: navigating Discover → open a movie or series detail page → press Back crashed the whole app with React's minified error #185, 100% reproducible, for both content types, only via Discover (not the regular Movies/Series grid's own Back flow).

**Root mechanism (same in both cases below)**: Discover's rows populate progressively — each of the ~9 top genres, plus What's New, resolves its own fetch independently and merges into state as soon as it lands (see `fetchGenreRows` above). When those responses resolve from the backend's own request cache in ~0-1ms each (confirmed via server logs — `[Discover] browse cache hit (0ms)` back-to-back for genre after genre), you get many state updates firing in immediate succession, fast enough that the browser never gets a chance to paint in between. React counts consecutive updates that never let a render actually settle/paint as a runaway loop and throws #185 — even when every individual update is legitimate and would be completely fine spread out over real time (e.g. a slower network).

This is **not** the classic "effect depends on an unstable inline closure" version of #185 (though that trap is real too — see `MediaCardRow.tsx` below) so much as a "legitimately-repeated-but-too-fast" version of the same invariant. Two independent code paths were both doing this simultaneously:

1. **`MediaCardRow.tsx`'s auto-load-more-if-row-doesn't-fill-viewport behavior.** `DiscoverView.tsx` passes `onLoadMore={() => loadMoreGenreRow(genre, activeType)}` (and the equivalent for What's New) as a fresh inline closure on every render. `MediaCardRow`'s `updateScrollButtons` used to be a `useCallback` depending on that `onLoadMore` prop directly, and a mount/`items`-change effect depended on `updateScrollButtons` — so every render created a new closure → new `updateScrollButtons` identity → effect re-fires → `setState` → re-render → repeat. On top of that, a freshly-mounted short row (before it's had a chance to fill the visible width) auto-calls `onLoadMore()` as soon as `items` changes, and if the newly-appended page still doesn't fill the row, it calls again the moment that resolves — a legitimate "keep growing until it fills or runs out" behavior that becomes a tight synchronous-ish chain when resolutions are cache-fast.
   **Fix, two parts**: (a) `updateScrollButtons` now reads `onLoadMore`/`hasMore`/`loadingMore` via a ref (`updateScrollButtonsRef.current`, reassigned fresh every render) instead of putting them in a `useCallback`'s dependency array — the effect that calls it now only depends on `[items, updateScrollButtons]` where `updateScrollButtons` itself is permanently stable (empty deps), so the effect only re-fires when `items` actually, meaningfully changes, never merely because the caller's closure identity changed. (b) The `onLoadMore?.()` call itself inside `updateScrollButtonsRef.current` is now wrapped in `setTimeout(() => onLoadMore?.(), 0)` — a macrotask boundary that lets a paint happen between each auto-load-more step, so a chain of cache-fast resolutions can no longer stack up synchronously.
2. **`DiscoverView.tsx`'s own `onBackdropItemsChange` effect** (line ~236). `backdropItems` is a `useMemo` flattening `recommendations`/`whatsNew.items`/every genre row's items — since each of the ~9 genre fetches updates `genreRows` independently, `backdropItems` legitimately recomputes (new array) up to 9 times back-to-back on a fresh mount, and the effect reporting it up to `App.tsx`'s `setDiscoverBackdropItems` fired every single time, with the same "9 updates before the first one ever gets to paint" problem as above.
   **Fix**: the report is now debounced to one `requestAnimationFrame` per burst — cancel any pending rAF and schedule a new one on every `backdropItems` change, so only the *last* value in a rapid burst actually reaches the parent, once per frame, instead of once per genre.

**How this was actually diagnosed, not guessed**: the production error overlay only gives a minified stack (`index-<hash>.js:49:xxxxx`, `DiscoverView-<hash>.js:6:xxx`) which is useless on its own — several early attempts at fixing this from stack-shape/line-number pattern-matching against unminified source were wrong or incomplete. What actually worked: temporarily set `sourcemap: true` in `vite.config.ts`'s `build` block, run the exact same `npm run build` (Vite's content hash for a given `dist/assets/*.js` file does **not** change just from adding a sourcemap — the same hash the user's browser already loaded gets regenerated, now with a matching `.map` file alongside it), then decode the *exact* reported `file:line:column` from the user's real error against that `.map` with the `source-map` npm package (`SourceMapConsumer.with(map, null, c => c.originalPositionFor({line, column}))`) — pinpointing the real `.tsx` source line directly instead of pattern-matching minified output. Sourcemaps are turned back off (`sourcemap: true` removed) before the final deploy — they're a temporary diagnostic step, not something to ship. If this class of bug recurs, repeat that exact process rather than guessing from the minified trace shape.

---

## `AmbientBackdrop.tsx` — shared by Discover and the main grid

Full-bleed blurred TMDB backdrop, `position: fixed` behind content. Only titles with a qualifying **high-res** backdrop (`backdrop_hd_path`) are used — no fallback to the lower-res `backdrop_path`, which is reserved for the detail-page hero. The rotation index is deliberately reset only on an actual *content* change to the item pool, not on every re-render: `items` gets a new array reference on every silent background refresh even when the backdrop-carrying subset and order are unchanged, so a content-stable `urlsKey` (joined URL string) gates the `useMemo` that would otherwise yank the backdrop back to index 0 on every refresh. The crossfade holds both the outgoing and incoming image mounted simultaneously (`outgoingUrl`/`displayedUrl`, both driven off the same `settled` flag) rather than fading the incoming image in on top of a statically-opaque outgoing one — the naive version just looked like a brief double-exposure, not a fade.

---

## Key Files

- `src/api/endpoints/discover.ts` — `getFacets`, `getDiscoverBrowse`, `getRecommendations`, `getDiscoverVariants`
- `src/hooks/useDiscover.ts` — facets/browse/recommendations/genre-row state
- `src/components/organisms/discover/DiscoverView.tsx` — top-level Discover screen, filtered-grid vs. row-layout switch. `App.tsx` mounts this via `React.lazy` + `Suspense` (only loaded once the user opens Discover, not on initial app load) — if you add a new required prop, make sure it's still available synchronously wherever `showDiscover` flips true, since there's no loading-state prop threading beyond the `Suspense` fallback. Its `onBackdropItemsChange` report is rAF-coalesced (not called synchronously per `backdropItems` change) — see the error #185 section above
- `src/components/organisms/discover/DiscoverFilters.tsx`, `CategorySelector.tsx` — genre/country/language/theme filter dropdown, VOD category sidebar (`CategorySelector`'s own state/handlers now live in `src/hooks/useCategorySelector.ts`, with the pin-management overlay split into `discover/category-selector/CategoryPinOverlay.tsx`)
- `src/components/organisms/browse/RecommendedRow.tsx`, `MediaCardRow.tsx` — row rendering, infinite scroll. `MediaCardRow.tsx`'s `updateScrollButtons`/auto-load-more must stay decoupled from the caller's `onLoadMore` closure identity (via the `updateScrollButtonsRef` indirection) and deferred by a macrotask (`setTimeout(..., 0)`) — see the error #185 section above before "simplifying" either back to a direct `useCallback` dependency or a synchronous call
- `src/hooks/useNavigationHistory.ts` — `applyFrame`'s empty-placeholder refetch branch must exclude Discover frames (`!frame.showDiscover`), since Discover never populates the grid's own `items`/`context` — see `skill-video-playback.md`'s Navigation flicker section, race #4
- `src/components/molecules/AmbientBackdrop.tsx`, `src/components/molecules/VariantPickerModal.tsx`
- `src/hooks/useDiscoverNavigation.ts` — `openDiscoverItem`, `handleDiscoverItemClick`, `onSelectVariant`, `handleCarouselAction` (the actual translation/resolution layer, wired into `App.tsx` via `pushFrame`/`fetchData`/`setCurrentSeriesItem`/the picker+detail setters passed in as args)
- `src/hooks/useSearchController.ts` — search debounce/submit + the context-search sync-back effect (kept as one pair — splitting either half reintroduces a stale-resubmit loop, see the hook's own comment)
