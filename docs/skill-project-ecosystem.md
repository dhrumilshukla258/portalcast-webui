# Project ecosystem

**This repo:** `portalcast-webui` — the browser web app (React/Vite), also
built as a Samsung Tizen TV app target. Its `src/api/` SDK (`client.ts`,
`config.ts`, `platform.ts`, `types/`+`endpoints/`) is the reference contract
for "what does `/v2/movies` return" — the spec any new native client should
be built against.

**How it interacts with sibling projects:**
- Talks to `portalcast-server`'s `/api/v2/*` for all data. Its built output
  is committed into `portalcast-server`'s `public/` folder — not built by
  that repo's own Docker build, so it must be manually rebuilt+copied (or via
  this repo's `deploy.sh`) whenever webui source changes.
- Was explicitly tried on a Hisense Android TV via browser and found
  unintuitive for remote-control/d-pad navigation — not reused by
  `portalcast-tv-android`, which is a purpose-built 10-foot UI instead.

See `../../docs/project_ecosystem.md` (shared across all portalcast-* repos)
for the full multi-repo product ecosystem, planned future clients, and
cross-cutting design decisions.
