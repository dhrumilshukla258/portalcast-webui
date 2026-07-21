# Build Config & Multi-Target Deployment — Skill Reference

Covers `vite.config.ts`, `deploy.sh`, `scripts/sync-dist.mjs`, and how `VITE_API_HOST` drives the server-vs-Tizen build split. For the runtime behavior of `getBaseUrl()`/`getServerUrl()`/`webPlatformAdapter` (as opposed to how the build feeds them), see `skill-api-client.md`.

---

## `npm run build` silently writes into a sibling git repo — read this before running it for any reason

`package.json`'s `postbuild` hook (`node scripts/sync-dist.mjs`) runs after **every** `npm run build`, including one you run just to check the project compiles. It `rmSync`s and then `cpSync`s `dist/` into `../portalcast-server/public/` — a directory inside a **different repository's working tree**, expected checked out as a sibling of this repo. There is no dry-run, no confirmation prompt, and no npm flag that skips it short of not invoking `build` at all (or exporting a bogus `PORTALCAST_SERVER_PUBLIC_DIR`).

- **Override**: `PORTALCAST_SERVER_PUBLIC_DIR` env var replaces the default `../portalcast-server/public` target.
- **If `portalcast-server` isn't checked out next to this repo**: the script checks `existsSync(resolve(targetDir, '..'))` — i.e. it only verifies the *parent* (`portalcast-server/`) exists, not `public/` itself (which it creates). If the parent is missing, it fails loudly with a clear message and `process.exit(1)`, so `npm run build` itself reports failure even though `dist/` was built successfully. It does **not** silently no-op — but if you only skim the tail of a long build log you can still miss the error and assume the build failed for some other reason.
- Because the wipe (`rmSync(targetDir, { recursive: true, force: true })`) happens unconditionally, running a build with stale/uncommitted work sitting in `portalcast-server/public/` (e.g. you were hand-editing a file there to debug something) destroys it with no backup.

---

## `deploy.sh`'s two modes differ in exactly one env var: `VITE_API_HOST`

Both modes run the identical `npm run build -- --mode production`; the only thing that changes is what `VITE_API_HOST` is set to before the build, which is baked into the bundle at build time (Vite inlines `import.meta.env.*` — it is not read at runtime).

- **Default (server) mode**: forces `API_HOST="/"`. `src/api/config.ts`'s `getBaseUrl()` special-cases this: `host === '/' ? '/api' : ...` — i.e. `"/"` isn't treated as a literal host to prefix, it collapses to a relative `/api` path. This only works because the app is served from the same origin as the API (the Node server serves both `dist/` and `/api/*`).
- **`--tizen` mode**: leaves `API_HOST` as whatever `VITE_API_HOST` resolves to from `.env`/`.env.production` (an absolute `http://SERVER_IP:3000`-style URL) — because a Tizen app isn't served *from* the portalcast-server origin, there is no "same origin" to be relative to, so the host must be hardcoded into the build.
- This means **rebuilding for Tizen requires a real `VITE_API_HOST` in `.env`** — if it's unset, `API_HOST` is empty, gets baked in as an empty string, and `getBaseUrl()` produces `"/api"` anyway (silently falling back to relative-path behavior on a device where that's wrong), not an error. Nothing catches this at build time.
- A runtime override also exists (`setServerUrl()` in `config.ts`, persisted via `PlatformAdapter.storage`) for an in-app "enter your server URL" flow — this takes priority over the build-time value at read time (`getServerUrl()` checks storage first). The static `BASE_URL` export, however, is a **one-time snapshot** evaluated at module load — code that imported `BASE_URL` directly (kept for source compatibility with pre-migration call sites) will *not* reflect a runtime override; only `getBaseUrl()`/`getServerUrl()` calls will. If a runtime server-URL change doesn't seem to take effect somewhere, check whether that call site is using the stale `BASE_URL` constant.
- `deploy.sh`'s destination-wipe safety check (`rm -rf "$DEST_DIR"/*`) only fires if `$DEST_DIR` contains the substring `"public"` or `"stalker"` — anything else just prints a warning and skips cleaning, so old files from a previous build/rename can silently linger in the deploy target. If you point `TIZEN_DIR`/`SERVER_DIR` at a path that doesn't match either substring, you own the cleanup yourself.

---

## PWA service worker: caches the shell and images, never the API or streams

`vite.config.ts`'s `VitePWA` config has three `runtimeCaching` rules with **first-match-wins** ordering (Workbox semantics):

1. `/api/images/*` → `StaleWhileRevalidate`. Safe to cache because poster/thumbnail URLs are stable and non-tokenized (unlike stream/proxy URLs, which mint a fresh token per session) and the server already sends `max-age=3600` on that route — the cache's `maxAgeSeconds` mirrors it rather than inventing its own policy.
2. Any remaining image request (`request.destination === 'image'`) → `CacheFirst`, 30-day expiry, `cacheableResponse.statuses: [0, 200]`. This exists specifically because rule 1 only matches the portal-proxied `/api/images/...` path — it does **not** match Discover's TMDB-hosted artwork (`AmbientBackdrop.tsx`, `MediaCard.tsx`, `MediaCardRow.tsx`), which are absolute cross-origin URLs. Without this rule, every Discover row's images re-fetch on every tab switch/scroll-back with zero caching, since they fall straight through to an uncontrolled network request. `cacheableResponse: { statuses: [0, 200] }` is required because a cross-origin `<img>` request has no CORS grant, so the response the SW sees is opaque (`status: 0`) — without explicitly allowing status `0`, Workbox's default `cacheableResponse` check (200 only) would silently refuse to cache it. `CacheFirst` (not `StaleWhileRevalidate` like rule 1) because there's no known `Cache-Control` from a third-party CDN to mirror and these URLs are effectively immutable per-path — once cached, there's no value in a background revalidation.
3. Everything else under `/api`, `/proxy`, `/player`, or matching `.m3u8`/`.ts`/`.mp4` → `NetworkOnly`. Must stay **last** — if reordered ahead of the image rules, the broader `/api` match would shadow rule 1 and it would never fire. Doesn't conflict with rule 2 in practice (plain image URLs don't match `/api`/`/proxy`/`/player`/media-file extensions), so its position relative to rule 2 specifically doesn't matter, only relative to rule 1.

All of this only takes effect in a **built** app (`vite build`) served over what the browser considers a valid service-worker origin (HTTPS or `localhost`) — `vite dev` doesn't register the service worker by default (`devOptions.enabled` isn't set), so none of this caching is observable while running the dev server. If you're testing "does this image get cached," test against `dist/` (`vite preview` or a real deploy), not `npm run dev`.

`navigateFallbackDenylist` (`/^\/api/`, `/^\/proxy/`, `/^\/live\.m3u8/`, `/^\/player/`) exists so the SW's SPA-shell fallback (serving cached `index.html` for any unmatched navigation, the standard PWA offline-app-shell behavior) doesn't intercept a direct navigation to a stream/API URL and serve the app shell instead of failing through to the network.

Net effect: nothing content- or auth-sensitive is ever cached by the service worker — only the static app shell (`globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']`) and poster images. There is no risk of a stale login/session/stream response being served from cache. `registerType: 'autoUpdate'` + `skipWaiting: true` + `clientsClaim: true` means a new build takes over open tabs on next navigation without the user manually clearing anything — don't add a "confirm before updating" prompt without checking whether that combination is still intended; the tradeoff already made here is "always serve the latest shell," not "ask the user."

---

## Code splitting — `Admin`, `VideoPlayer`, `DiscoverView` are all `React.lazy`

`App.tsx` lazy-loads all three of the heaviest feature trees instead of bundling them into the main chunk: `Admin` (admin-only, rarely visited), `VideoPlayer` (pulls in the HLS/vidstack stack, one of the heaviest deps in the app, only needed once playback actually starts), and `DiscoverView` (only mounted once the user opens the Discover tab). Each has its own `React.Suspense` boundary at the JSX call site — `Admin`'s route has a full-screen spinner fallback, `VideoPlayer`'s has a black-screen spinner fallback (matches the player's own background so the swap-in isn't jarring), and `DiscoverView`'s fallback is `null` (it mounts inline within the existing app chrome, so a spinner there would flash against already-visible UI).

This dropped the main `index-*.js` chunk from ~887 kB to ~480 kB (pre-gzip) and cleared Vite's chunk-size warning. If you add a new heavy feature tree that isn't needed on initial paint, follow the same pattern rather than adding a plain `import` — check `vite build`'s output for the warning as a signal something regressed.

---

## Path aliasing (`@/`) — plain alias, nothing surprising

Configured in exactly two places that must stay in sync: `vite.config.ts`'s `resolve.alias` (`'@': path.resolve(__dirname, './src')`) for the actual bundler/dev-server resolution, and `tsconfig.app.json`'s `paths` for TypeScript/editor resolution. Nothing dynamic or platform-conditional about it — if `@/` imports start failing to resolve after a `tsconfig` restructure, check that both files still point at `./src`, not just one.

---

## The `$WEBAPIS/webapis/webapis.js` script tag in `index.html` is expected, not a bug

`index.html` unconditionally includes `<script src="$WEBAPIS/webapis/webapis.js"></script>` for the Tizen Smart TV JS API bridge. `$WEBAPIS` is a Tizen-runtime-only macro the Tizen web engine substitutes at load time — it does not exist as a resolvable path anywhere in this build, and Vite/esbuild will warn about it ("can't be bundled" / can't be treated as a module) because it looks like a broken asset reference to a bundler that has no idea what a Tizen device is. This is harmless in every non-Tizen build target: browsers and the PWA build simply fail to load that one script tag (404, swallowed) since nothing in the app calls into `webapis.*` outside Tizen-specific code paths gated by `isTizenDevice()`. Don't try to "fix" the warning by conditionally stripping the tag per-target — the same `dist/` output is used for both server and Tizen deploys (only `VITE_API_HOST` differs, see above), so the tag has to be present unconditionally for the Tizen build to work, and it's inert everywhere else.

---

## Key Files

- `vite.config.ts` — dev proxy (`/proxy`, `/api`, `/live.m3u8`, `/player`, `/uploads` → `localhost:3000`), `VitePWA` workbox/manifest config, `@/` alias, `base: './'` (relative asset paths — required since the same `dist/` is deployed under different mount points/origins for server vs. Tizen).
- `deploy.sh` — the only place `VITE_API_HOST` is conditionally overridden per deploy target; everything else about the two modes is identical.
- `scripts/sync-dist.mjs` — postbuild cross-repo sync into `portalcast-server/public/`; `PORTALCAST_SERVER_PUBLIC_DIR` env var override.
- `package.json` — `build` (`tsc -b && vite build`) and `postbuild` (sync-dist) scripts; note `postbuild` fires on any `npm run build` invocation, not just `deploy.sh`.
- `src/api/config.ts` — `getBaseUrl()`/`getServerUrl()` (runtime-aware) vs. `BASE_URL` (build-time snapshot, doesn't reflect runtime overrides); `"/"` → relative `/api` special case.
- `src/api/platform.ts` — `PlatformAdapter`/`isTizenDevice()`, consumed by `config.ts` for storage and by the app generally for Tizen-specific branching.
- `index.html` — the Tizen `$WEBAPIS` script tag.
- `tsconfig.app.json` — TS-side half of the `@/` alias, must match `vite.config.ts`.
