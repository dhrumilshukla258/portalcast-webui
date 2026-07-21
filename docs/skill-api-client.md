# API Client / Networking Layer — Skill Reference

Covers the fetch-based client (`src/api/client.ts`), URL/config resolution (`src/api/config.ts`), the platform storage abstraction (`src/api/platform.ts`), the public SDK surface (`src/api/index.ts`), and the per-domain `src/api/endpoints/*.ts` + `src/api/types/*.ts` files. Backend counterpart: portalcast-server's REST API (mounted under `/api`), plus `/auth/*` for token issuance/refresh.

---

## `client.ts` — plain `fetch`, not axios

There's no axios instance anywhere — `request()` in `client.ts` is a hand-rolled wrapper around the global `fetch`. Every endpoint file goes through `api.get/post/put/delete`, which all funnel into this single `request()` function, so auth-header injection, base-URL resolution, and 401 handling only need to exist in one place. `authFetch` (see below) is the one sanctioned escape hatch for call sites that need the raw `Response`.

## Base URL resolution — build-time env var + runtime override, not a proxy

`BASE_URL` is not simply `VITE_API_HOST` from `.env`. `config.ts`'s `getServerUrl()` prefers a **runtime-persisted override** (`server_url_override`, written via `setServerUrl()` from an in-app "enter your server URL" flow — needed because Tizen apps are built once and sideloaded, there's no per-deploy env var at that point) and only falls back to the build-time `VITE_API_HOST` (`deploy.sh`'s server-mode build bakes this in; `--tizen` mode typically leaves it unset so the runtime override is the only way to point at a server). `BASE_URL` itself is a **static snapshot** taken at module load — exported for source-compat with old code that imported the constant directly — while `URL_PATHS.HOST` is a live getter that re-resolves `getServerUrl()` on every access. If you need base-URL changes to take effect without a page reload, read through `URL_PATHS.HOST` (or call `getServerUrl()`/`getBaseUrl()` directly), not the `BASE_URL` constant — code holding onto `BASE_URL` will not see a `setServerUrl()` call made after module load.

`request()`'s URL construction branches on whether `URL_PATHS.HOST` is empty/`/` (relative — proxied through the same origin, e.g. dev server proxy or same-host deploy) vs. an absolute host: `new URL(fullUrl, window.location.origin)` vs. `new URL(fullUrl)`. Don't collapse this to always pass a base — an absolute `VITE_API_HOST` string is already a valid URL on its own and passing `window.location.origin` as a base to `new URL()` when `fullUrl` is already absolute is harmless, but the reverse (a relative path with no base) throws.

## Token refresh — implemented, with real dedup, not just a TODO

`performTokenRefresh()` + the `isRefreshing`/`refreshQueue` module-level state in `client.ts` **is** a working single-flight refresh flow, not a stub. On a 401 for a non-`/auth/*` request: if a refresh is already in progress, the request is queued (`refreshQueue.push`) instead of triggering a second concurrent `/auth/refresh` call; the first refresh to complete drains the whole queue with the new token. Without this, N concurrently-in-flight requests that all 401 at once (e.g. app resume after the access token expired while backgrounded) would fire N redundant refresh calls, and depending on backend refresh-token rotation, only the first response would still contain a valid refresh token — the rest would silently invalidate the session.

Two independent copies of this exact refresh-queue logic exist: one inside `request()` (used by `api.*`) and one inside `authFetch()`. They share the same module-level `isRefreshing`/`refreshQueue`/`performTokenRefresh` state, so a refresh triggered by one path correctly unblocks queued callers on the other path — but the retry-once/error-shaping logic itself is duplicated rather than factored out. If you fix a bug in one, check the other.

Requests to `/auth/*` itself never trigger the refresh flow on 401 — refreshing using a token obtained from a call to `/auth/login`/`/auth/refresh` failing would be nonsensical (there's no valid refresh token to use, or the request *is* the refresh attempt). Those 401s are just thrown as normal errors for the caller (`useLoginForm.ts` etc.) to handle.

## `auth-expired` event — the actual logout trigger, not a convenience

When refresh fails (no refresh token, or the refresh call itself errors/returns no `accessToken`), `client.ts` clears all three storage keys (`auth_token`/`refresh_token`/`auth_user`) and does `window.dispatchEvent(new Event('auth-expired'))` — a plain global `window` event, not anything React-specific. `AuthContext.tsx` is the sole listener (`window.addEventListener('auth-expired', ...)`), and reacts by clearing its own state and hard-navigating to `/login` (see `skill-auth.md`). This indirection exists because `client.ts` has no access to React context or the router — a 401 can originate from literally any in-flight request anywhere in the tree, including outside any component that has `useAuth()`/`navigate()` in scope, so a DOM event is the only channel that reaches from deep inside the networking layer back up to session-owning UI state.

## `webPlatformAdapter` / `platform.ts` — why the storage layer is pluggable at all

`client.ts` never calls `localStorage` directly — it goes through `platformAdapter.storage`, defaulted to `webPlatformAdapter` (a thin `localStorage` wrapper) but swappable via `setClientPlatformAdapter()`. This is forward-looking abstraction for non-web clients (Android TV/Roku native ports, per `index.ts`'s "native client ports should depend on `endpoints/` + `types/` alone" comment) that won't have `localStorage` at all. On today's actual Tizen target this doesn't change the storage backend (Tizen's WebView still has `localStorage`) — what it *does* change is `clientType`, resolved once at adapter-construction time via `isTizenDevice()` and sent to the server on login so the backend can apply different session rules per client type (e.g. the QR device-code flow's tokens, see `skill-auth.md`). `clientType` used to be sniffed inline per-request in `AuthContext`; centralizing it here means it's computed once and can't drift between call sites.

## AbortSignal — consistent convention, opt-in per call

Endpoints that back list/browse UI (`getMedia`, `getSeries`, `getMovieCategories`, `getSeriesCategories`, discover's browse/facets calls) all accept an optional trailing `signal?: AbortSignal` and thread it straight into `RequestConfig`, matching the pattern `useMediaLibrary.ts`/`useDiscover.ts` use to cancel a stale in-flight fetch when the user changes category/filter before the previous page's request resolves. Endpoints that are one-shot mutations or don't have a "supersede the previous call" scenario (`saveUserProgress`, `linkOpenSubtitles`, `getMovieUrl`, most of `admin.ts`/`profiles.ts`) don't bother — there's nothing to cancel. This isn't an oversight to "fix" by adding `signal` everywhere; only add it to an endpoint if a caller actually needs to abort a superseded request.

`getUserProgress()` (`user.ts`) deliberately does **not** take a `signal` — it has its own request-dedup mechanism instead (in-flight promise sharing + a 4s cache, see the file's own comment) specifically because it's called from several unrelated mount points near-simultaneously with no natural "supersedes" relationship between callers; cancellation isn't the right tool there, dedup is.

## `authFetch` — the one behavior change from the pre-refactor `fetch()` call sites

The subtitle search/probe (`src/api/endpoints/subtitles.ts`) and the stream reachability 404-check (now `src/context/video/useHlsRecovery.ts`, part of the `VideoContext.tsx` hook split — see `skill-video-playback.md`) used to call `fetch()` directly, bypassing the auth layer entirely. Routing them through `authFetch` gives them the bearer-token attach + 401-refresh-and-retry-once flow "for free," which is a real (intentional) behavior change, not just a rename — see the migration note in `client.ts`'s own doc comment.

---

## Key Files

- `src/api/client.ts` — `request()`/`api.*`/`authFetch`, token attach, 401 refresh-and-retry, `auth-expired` dispatch
- `src/api/config.ts` — `BASE_URL`/`URL_PATHS.HOST`/`getServerUrl`/`setServerUrl`, build-time vs. runtime host resolution
- `src/api/platform.ts` — `PlatformAdapter`/`TokenStorage`, `webPlatformAdapter`, `isTizenDevice()`-driven `clientType`
- `src/api/index.ts` — public SDK surface re-exporting `client`/`config`/`platform` + all `endpoints/`
- `src/api/endpoints/*.ts` — one file per backend domain (channels, movies, series, epg, carousel, downloads, auth, subtitles, admin, profiles, user, discover); thin wrappers over `api.*` plus any endpoint-specific response reshaping
- `src/api/types/*.ts` — response/request type definitions, one file per domain matching `endpoints/`
