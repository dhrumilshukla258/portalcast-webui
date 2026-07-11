# Admin Panel — Skill Reference

Covers the React admin dashboard (`/admin` route) — `Admin.tsx` and its tab components. Backend counterpart: stalker-m3u-server's `skill-admin-dashboard.md` and `skill-stream-tokens.md`.

---

## Deploying changes made here

This repo has no backend of its own — `stalker-m3u-server` serves the built output from its own `public/` folder, copied in at Docker build time (it does **not** build this project). After any change here:

1. `npm run build` → `dist/`
2. Copy `dist/*` into `stalker-m3u-server`'s `public/` (or run `./deploy.sh`, which automates this)
3. Rebuild/redeploy `stalker-m3u-server`'s Docker image

Skipping step 2–3 is the most common cause of "I fixed it but it's still broken" reports — the deployed instance is still running the previous build.

---

## Structure

`src/components/organisms/Admin.tsx` is a tabbed shell (`activeTab` state, no router sub-paths):

| Tab | Component | Purpose |
|-----|-----------|---------|
| Stats | `AdminStats.tsx` | User counts, recent logins, live "who's streaming what", STRM generate button |
| Profiles | `ProfileManager.tsx` | Portal profile CRUD (pre-existing) |
| Users | `UserManager.tsx` | User approval/role management (pre-existing) |
| Content | `ContentManager.tsx` | Genre/item override CRUD — React port of the legacy `/contentmanager` standalone page |
| Carousel | inline `CarouselConfigManager` (bottom of `Admin.tsx`) | Homepage carousel slides (pre-existing) |
| Config | inline form in `Admin.tsx` | Provider connection settings (pre-existing) |
| Logs | inline in `Admin.tsx` | Live server log tail via Socket.IO `server_log` event (pre-existing) |
| API | `ApiReference.tsx` | Static, read-only list of backend endpoints grouped by area — documentation only, no requests made |

Route guard: `App.tsx`'s `ProtectedRoute adminOnly` — redirects non-admins to `/`. Nav entry: `Header.tsx`'s user-avatar dropdown, gated on `user.role === 'admin'`.

---

## `ContentManager.tsx` — React port of `/contentmanager`

The legacy page (`stalker-m3u-server`'s `src/routes/contentmanager.ts`) is a self-contained vanilla-JS mini-app with its own login. This component hits the **same backend endpoints** (`/api/admin/genres`, `/api/admin/items`, see stalker-m3u-server's `skill-content-manager.md`) from inside the normal app shell — no separate URL/login needed.

Simplifications vs. the legacy page (deliberate, not oversights):
- **Up/down arrow reordering instead of drag-and-drop** — matches the existing `CarouselConfigManager` pattern already in this codebase. Reorder buttons are disabled while a search filter is active (reordering a filtered subset would corrupt the real sort order — same rule the legacy page enforces via its own `isFiltering` check).
- No bulk multi-select move (legacy page supports shift+click range select) — single-item operations only, for now.

### Known race condition class — read before touching category/type switching

`loadCategories`/`loadItems` originally had no protection against out-of-order responses: clicking category A then quickly clicking category B could have A's (slower) response land *after* B's and silently overwrite B's items with stale data — same bug class as below in navigation. Fixed with a request-sequence ref guard (`catsRequestRef`/`itemsRequestRef`, incremented per call, response only applied if it still matches the current ref value). **Apply the same pattern to any new async list-loading code in this file** rather than a plain `useState` + `await` + `setState`.

---

## `AdminStats.tsx` — Stats tab

- Polls `GET /api/admin/stats` once on mount, and `GET /api/admin/streams` on a **user-configurable interval** (free-text seconds input, default 5s, persisted to `localStorage` as `admin_stream_refresh_ms`). Changing the interval only reschedules future polls — it never clears currently-displayed data (`setStreams(response)` is one atomic replace).
- Live Streams table has an All/Live/Movie/Series filter (`displayKind()` — falls back to the transport `type` when the backend `kind` field is `null`, for sessions that predate the metadata or don't have it, e.g. incidental proxy traffic).
- **Title/Category columns reflect exactly what the frontend sent**, not anything resolved server-side — see `skill-video-playback.md`'s title-resolution section for where that data comes from and why the naive approach (using the resolved playable file's own name) shows garbage.
- "Connected now" stat prefers the live Socket.IO `activeUserCount` (from `useSocket()`) over the REST snapshot (`stats.connectedDevices`) when available — same underlying signal (`SocketService`'s device map), just fresher via the socket.

---

## Key Files

- `src/components/organisms/Admin.tsx` — tab shell
- `src/components/organisms/AdminStats.tsx`
- `src/components/organisms/ContentManager.tsx`
- `src/components/organisms/ApiReference.tsx`
- `src/context/useSocket.ts` — `activeUserCount`/`activeDevices`
