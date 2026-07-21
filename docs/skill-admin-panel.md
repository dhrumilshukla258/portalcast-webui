# Admin Panel — Skill Reference

Covers the React admin dashboard (`/admin` route) — `Admin.tsx` and its tab components. Backend counterpart: portalcast-server's `skill-admin-dashboard.md` and `skill-stream-tokens.md`.

---

## Deploying changes made here

This repo has no backend of its own — `portalcast-server` serves the built output from its own `public/` folder, copied in at Docker build time (it does **not** build this project). After any change here:

1. `npm run build` → `dist/`
2. Copy `dist/*` into `portalcast-server`'s `public/` (or run `./deploy.sh`, which automates this)
3. Rebuild/redeploy `portalcast-server`'s Docker image

Skipping step 2–3 is the most common cause of "I fixed it but it's still broken" reports — the deployed instance is still running the previous build.

---

## Structure

All admin-tab components live under `src/components/organisms/admin/` (moved out of the flat `organisms/` directory in a folder reorg — see [[skill-browsing-grid]] for the same reorg applied to the browse/discover/video organisms).

`src/components/organisms/admin/Admin.tsx` is a tabbed shell (`activeTab` state, no router sub-paths):

| Tab | Component | Purpose |
|-----|-----------|---------|
| Stats | `AdminStats.tsx` | User counts, recent logins, live "who's streaming what", STRM generate button |
| Profiles | `ProfileManager.tsx` | Portal profile CRUD (pre-existing) |
| Users | `UserManager.tsx` | User approval/role management (pre-existing) |
| Content | `ContentManager.tsx` | Genre/item override CRUD — React port of the legacy `/contentmanager` standalone page |
| Carousel | `CarouselConfigManager.tsx` | Homepage carousel slides |
| Config | `ConfigTab.tsx` | Provider connection settings |
| Logs | `LogsTab.tsx` | Live server log tail via Socket.IO `server_log` event |
| API | `ApiReference.tsx` | Static, read-only list of backend endpoints grouped by area — documentation only, no requests made |

Carousel/Config/Logs used to live inline at the bottom of `Admin.tsx` (that's what older versions of this doc, and old commit history, describe) — they've since been pulled out into their own standalone files under `src/components/organisms/admin/`, same pattern as `ContentManager.tsx`/`AdminStats.tsx` always used. `Admin.tsx` itself is now purely the tab shell + nav; if you're looking for the Carousel form, Config form, or the log-tail UI, they aren't in `Admin.tsx` anymore.

`LogsTab.tsx`'s `start_logging` socket emit now sends `{ token }` (the admin's JWT) in the join payload — the server added an auth check on that room join and silently ignores unauthenticated joins (fail-closed, no error event back). If the Logs tab ever shows "No incoming logs..." forever with no console error, check that `useAuth()`'s `token` is actually populated before this component mounts, not a server-side regression.

Route guard: `App.tsx`'s `ProtectedRoute adminOnly` — redirects non-admins to `/`. Nav entry: `Header.tsx`'s user-avatar dropdown, gated on `user.role === 'admin'`.

---

## `ContentManager.tsx` — React port of `/contentmanager`

The legacy page (`portalcast-server`'s `src/routes/contentmanager.ts`) is a self-contained vanilla-JS mini-app with its own login. This component hits the **same backend endpoints** (`/api/admin/genres`, `/api/admin/items`, see portalcast-server's `skill-content-manager.md`) from inside the normal app shell — no separate URL/login needed.

Simplifications vs. the legacy page (deliberate, not oversights):
- **Up/down arrow reordering instead of drag-and-drop** — matches the existing `CarouselConfigManager` pattern already in this codebase. Reorder buttons are disabled while a search filter is active (reordering a filtered subset would corrupt the real sort order — same rule the legacy page enforces via its own `isFiltering` check).
- No bulk multi-select move (legacy page supports shift+click range select) — single-item operations only, for now.

### Known race condition class — read before touching category/type switching

`loadCategories`/`loadItems` originally had no protection against out-of-order responses: clicking category A then quickly clicking category B could have A's (slower) response land *after* B's and silently overwrite B's items with stale data — same bug class as below in navigation. Fixed with a request-sequence ref guard (`catsRequestRef`/`itemsRequestRef`, incremented per call, response only applied if it still matches the current ref value). **Apply the same pattern to any new async list-loading code in this file** rather than a plain `useState` + `await` + `setState`.

All of the state/handlers described above (including the request-sequence guards) now live in `src/hooks/useContentManager.ts`, not in `ContentManager.tsx` itself — the component composes `admin/content-manager/CategoriesPanel.tsx` and `ItemsPanel.tsx`, which are pure presentational pieces driven entirely by props from the hook.

---

## `AdminStats.tsx` — Stats tab

- Polls `GET /api/admin/stats` once on mount, and `GET /api/admin/streams` on a **user-configurable interval** (free-text seconds input, default 5s, persisted to `localStorage` as `admin_stream_refresh_ms`). Changing the interval only reschedules future polls — it never clears currently-displayed data (`setStreams(response)` is one atomic replace).
- Live Streams table has an All/Live/Movie/Series filter (`displayKind()` — falls back to the transport `type` when the backend `kind` field is `null`, for sessions that predate the metadata or don't have it, e.g. incidental proxy traffic).
- **Title/Category columns reflect exactly what the frontend sent**, not anything resolved server-side — see `skill-video-playback.md`'s title-resolution section for where that data comes from and why the naive approach (using the resolved playable file's own name) shows garbage.
- "Connected now" stat prefers the live Socket.IO `activeUserCount` (from `useSocket()`) over the REST snapshot (`stats.connectedDevices`) when available — same underlying signal (`SocketService`'s device map), just fresher via the socket.

### Admin tab files have been split into hook + presentational layers

`AdminStats.tsx`, `ConfigTab.tsx`, `CarouselConfigManager.tsx`, `ContentManager.tsx`, and `ProfileManager.tsx` each used to own their network calls, form state, and JSX in one file. All five now follow the same split: a `useXxx.ts` hook in `src/hooks/` owns every handler/network call/piece of state described above, and the component file is JSX only, composing smaller presentational pieces (colocated in a matching `admin/<tab-name>/` subfolder):

- **Stats**: `useAdminStats.ts` (all polling/fetch/socket logic + the types/color/label constants — `Stats`, `StreamSession`, `PortalMetrics`, `CATEGORY_ORDER`, `categoryColor`, `displayKind`, etc., all exported from there now, not from `AdminStats.tsx`). JSX pulls in `StatCard.tsx` and `PortalTimelineChart.tsx` from `src/components/molecules/` — both were inline sub-components before.
- **Config**: `useConfigTabActions.ts` (the `Config`/`Group` types plus every handler — import/parse, load/save, the four provider-refresh actions, the two destructive confirm flows). JSX is split into `ConnectionForm.tsx` (connection details + credentials), `LibrarySettingsForm.tsx` (group select + refresh buttons), and `ImportUrlModal.tsx`.
- **Carousel**: `useCarouselForm.ts` (slide list + add/edit form state, including the deferred per-variant upload sequencing). JSX is split into `SlideEditor.tsx` (the add/edit form) and `SlideList.tsx` (the slide cards + reorder/edit/delete buttons).
- **Content**: `useContentManager.ts` (categories/items state, the request-sequence guards described above, filtering/sorting). JSX is split into `admin/content-manager/CategoriesPanel.tsx` and `ItemsPanel.tsx`.
- **Profiles**: `useProfileManager.ts` (profile list, activate/enable/delete/duplicate/create handlers, the shared `ConfirmationModal` state). JSX is split into `admin/profile-manager/ProfileCard.tsx` and `CreateProfileModal.tsx`.

If you're hunting for a handler and it's not in the tab's own `.tsx` file, check the matching hook in `src/hooks/` first.

---

## Key Files

- `src/components/organisms/admin/Admin.tsx` — tab shell
- `src/components/organisms/admin/AdminStats.tsx` + `src/hooks/useAdminStats.ts` + `src/components/molecules/StatCard.tsx`/`PortalTimelineChart.tsx`
- `src/components/organisms/admin/ContentManager.tsx` + `src/hooks/useContentManager.ts` + `admin/content-manager/CategoriesPanel.tsx`/`ItemsPanel.tsx`
- `src/components/organisms/admin/ProfileManager.tsx` + `src/hooks/useProfileManager.ts` + `admin/profile-manager/ProfileCard.tsx`/`CreateProfileModal.tsx`
- `src/components/organisms/admin/CarouselConfigManager.tsx` + `src/hooks/useCarouselForm.ts` + `SlideEditor.tsx`/`SlideList.tsx` — carousel slide CRUD, deferred multi-variant (desktop/tablet/mobile) image upload
- `src/components/organisms/admin/ConfigTab.tsx` + `src/hooks/useConfigTabActions.ts` + `ConnectionForm.tsx`/`LibrarySettingsForm.tsx`/`ImportUrlModal.tsx` — provider connection settings, group sync, cache/history clearing
- `src/components/organisms/admin/LogsTab.tsx` — live log tail, requires JWT in the `start_logging` socket payload
- `src/components/organisms/admin/UserManager.tsx` + `src/hooks/useUserManager.ts` + `ActiveSessionsPanel.tsx`/`AddUserModal.tsx`/`EditUserModal.tsx`
- `src/components/organisms/admin/ApiReference.tsx`
- `src/context/useSocket.ts` — `activeUserCount`/`activeDevices`
