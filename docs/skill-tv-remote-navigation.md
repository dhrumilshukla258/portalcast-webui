# TV Remote / D-pad Browsing Navigation — Skill Reference

Covers `useTVFocus.ts` — the arrow-key/D-pad focus-navigation system for **browsing screens** (main content grid, category sidebar, search box, header). This is the third of three separate remote-nav implementations in this codebase; it does not govern playback. See `skill-video-playback.md` for the other two: `useTVRemoteNavigation.ts` (in-player controls, owns `navRef`) and `useChannelListNav.ts` (the channel-switch overlay shown from within the player). If a remote-nav bug report doesn't mention the player, it's this file.

---

## No real "zones" concept — a single flat index over global DOM order, with grid-aware overrides

There's no region/zone data structure. `getFocusableElements()` does one `querySelectorAll('[data-focusable="true"]')` (scoped to whichever modal is open, else the whole document) and treats the result as one flat array; `focusedIndex` is just a position in that array. Left/right (`37`/`39`) simply move `±1` through it — this only works because DOM order already puts the category sidebar/header before the grid.

Up/down (`38`/`40`) can't get away with `±1` because a content grid wraps visually into rows the flat array doesn't represent — so they compute `grid-template-columns`'s column count live via `getComputedStyle` and jump `±cols`. When that jump would land outside the current grid/list (`.grid, .channel-list`), it's treated as "leaving the grid": going up looks for `[data-focus-group="categories"]` and prefers its `[data-selected="true"]` element (so returning to the sidebar re-lands on the actually-active category, not always the first one); going down looks for whatever comes immediately after the current grid's last focusable element, or calls `handlePageChange(1)` if there's nothing left to land on (see pagination section). Non-grid regions (anything wrapped in `[data-focus-group="..."]`, e.g. the category strip) use first/last-element-in-group boundary checks instead of a column jump.

**If you add a new browsing region**, it needs `data-focusable="true"` on every interactive element and, if it should behave as a coherent block for boundary detection, either the `.grid`/`.channel-list` class or `[data-focus-group="..."]`. Skipping this doesn't error — it just makes the region invisible to up/down boundary logic, so arrowing into it lands correctly (flat-array order) but arrowing out of it falls through to the generic "just move by 1" fallback instead of the intended jump target.

---

## `data-default-focus` beats DOM order on initial landing

`getFirstContentIndex()` prefers an element with `data-default-focus="true"` (e.g. a detail page's Play button) over literal first-in-document-order. Without this, whatever happens to be first in the markup — often a Back button placed above content purely for CSS layout reasons — would get permanently lit with the TV-focus glow on page load, landing the user on Back instead of the actually-useful action. Falls back to "first focusable element not inside `<header>`" if nothing declares a default, so header controls (search, sort) never silently steal the landing focus either.

---

## Modal-open focus save/restore is not "let the browser handle it"

`getFocusableElements()` re-scopes to whichever modal container is present (`.detail-modal-container`, `[role="dialog"]`, `.categories-modal-container`) rather than the whole document — so `focusedIndex` (a plain integer into that scoped array) means something completely different depending on whether a modal is open. The browser's native focus trapping doesn't help here because there's no real DOM focus trap: nothing prevents `document.activeElement` from pointing at an element behind the modal, and `focusedIndex` is app state, not `document.activeElement`.

The effect at the top of the file (`isDetailOpen || isConfirmingDelete || isCategoriesOpen`) explicitly saves `focusedIndex` into `savedGridIndex` before jumping focus into the modal's default element, and restores it when all three flags go false. Without this, closing a modal would leave `focusedIndex` pointing at whatever index it happened to end at *inside* the modal's scoped array — which, reinterpreted against the full-page array once the modal unmounts, is essentially a random element, not the item the user was actually on in the grid.

The 50ms `setTimeout` before scanning for the modal's default-focus element exists because the modal's own children (and their `data-focusable`/`data-default-focus` attributes) aren't in the DOM yet in the same tick the flag flips — this hook reacts to state, not to the modal's own mount.

---

## Tizen key registration — without it, the remote's dedicated buttons never reach `keydown` at all

On real Tizen hardware (not the browser dev environment, where every key already generates a normal DOM event), media/channel/color-button keys are **suppressed by the platform** unless explicitly claimed via `tizen.tvinputdevice.registerKey()`. The effect registers `MediaPlay/Pause/PlayPause/Stop/FastForward/Rewind`, `ChannelUp/Down`, and the four color keys (`ColorF0Red`..`ColorF3Blue`) on mount and unregisters them on unmount. If a key isn't in `keysToRegister`, pressing it on an actual Tizen TV produces **no keydown event whatsoever** — not a "handled and ignored" event, nothing observable in JS at all. This is why testing remote-nav purely in a desktop browser can pass while the same build is silently dead on hardware for any key not in this list; if you need to handle a new dedicated remote button, it has to be added here first, and this is invisible in any non-Tizen testing.

Numeric keyCodes used directly in the switch (`403`/`404`/`405`/`406` = the four color keys' legacy Tizen keyCode mapping, distinct from `registerKey`'s string names) are also Tizen-specific and won't fire in a regular browser — don't expect to exercise the color-key shortcuts (clear-watched, movie/series/tv switch, sort cycle) outside a real device or the Tizen emulator.

---

## `checkAndFetchNextPage` — pagination is a side effect of arrowing near the grid's end, not scroll position

Called from both the right-arrow and down-arrow branches after a successful index move (not on left/up — you only need more data moving forward). It re-derives the grid's live column count the same way the up/down handlers do and fires `handlePageChange(1)` once `newIndex >= totalItems - cols` — i.e. once the D-pad is about to run out of loaded rows, roughly one row early rather than exactly at the last item, so the fetch has a head start before the user actually hits the wall. Explicitly opts out for `contentType === 'tv'` (channel lists aren't paginated the same way).

This is a separate trigger path from `useInfiniteScroll.ts`'s scroll-position/fill-viewport listeners (see `skill-video-playback.md`'s Key Files) — on a TV where the user never scrolls with a pointer, arrow-key traversal is the *only* thing that can reach the bottom of the loaded set, so this hook has to own its own pagination trigger rather than relying on a scroll event that will never fire. `handlePageChange` itself (`useMediaLibrary.ts`) guards against duplicate/overlapping calls via `isFetchingMore.current` and a loaded-vs-total-count check, so calling it repeatedly from rapid key-repeat is safe — the guard lives on the callee side, not here.

---

## DOM queries run fresh on every keypress, uncached, deliberately

`getFocusableElements()`, the grid `getComputedStyle` column-count lookup, and the modal-open `querySelector` checks all re-run inside the `keydown` handler itself on every single arrow press — no memoized DOM snapshot. This is the same trade-off `Login.tsx`'s spatial-nav effect makes (see `skill-auth.md`): gated by actual user key-repeat rate (tens of elements, one event at a time), not a render loop, so the cost is negligible in practice. The alternative — caching the focusable list and invalidating on some mutation signal — was traded away because grid contents change from several independent sources (pagination appending items, category switch replacing them, modal open/close changing what's even in scope), and a caching layer that misses one of those invalidation paths produces a much worse bug (navigating into stale/removed elements) than the query cost it would save.

---

## Key Files

- `src/hooks/useTVFocus.ts` — the whole system: `getFocusableElements`, `getFirstContentIndex`, the modal save/restore effect, Tizen key registration effect, `checkAndFetchNextPage`, the keydown handler, and the focus-application effect (adds `.focused` class + calls `.focus()`/`.scrollIntoView`).
- `src/App.tsx` — wires `useTVFocus` in; owns `focusedIndex`/`setFocusedIndex` itself (passed down, not owned by the hook) alongside `handleBack`, `handlePageChange`, `cycleSort`, `handleContentTypeChange`, `handleClearWatched`, and the `isDetailOpen`/`isConfirmingDelete`/`isCategoriesOpen` flags that drive modal save/restore.
- `src/components/organisms/browse/MainContentGrid.tsx` — marks up `data-focusable="true"`/`data-default-focus="true"` on grid cards and the `.grid` container the column-count logic reads.
- `src/components/organisms/discover/CategorySelector.tsx` / `src/components/organisms/admin/DraggableCategoryList.tsx` — the sidebar/strip, marked `data-focus-group="categories"` with `data-selected="true"` on the active category button, which the up-arrow-leaving-grid logic specifically looks for.
- `src/hooks/useMediaLibrary.ts` — `handlePageChange` (the actual fetch triggered by `checkAndFetchNextPage`), `useInfiniteScroll.ts` (the pointer/scroll-driven pagination trigger this hook parallels for D-pad-only devices).
- Contrast: `src/components/organisms/video/hooks/useTVRemoteNavigation.ts` (in-player controls, see `skill-video-playback.md`) and `src/hooks/useChannelListNav.ts` (channel-switch overlay, same doc) — both separate remote-nav state machines that only apply once a stream is open; this file's own keydown handler explicitly bails (`if (streamUrl) return`) so the two systems never fight over the same keypress.
