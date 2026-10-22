// Answer versions (server Phase 3a). With its in-memory catalog on, the server sends
// X-Catalog-Version and X-Home-Version on every answer. Catalog reads (Discover, people,
// people search, groups, movies/series lists) and Home then carry `v=<version>`, and the server
// marks an answer at the current version as cached for a year: a screen visited again comes
// from the browser's HTTP cache with no request. When the version moves, the addresses change.
//
// A cached answer still hands back its old headers, so a version is only taken from an answer
// at least as recent (Date header) as the last one taken: reading old ones back would pin the
// app to its own cache. An answer without the header (an older server, the catalog off)
// clears the versions: plain addresses and the usual caching.
// A title's own answer (movieId, seasonId, episodeId) never carries `v`: it holds play links.

import { onApiHeaders, setVersionSource } from './client';

let catalog: string | null = null;
let home: string | null = null;
let takenAt = 0;

const CATALOG_PATH = /^\/v2\/(discover\/(facets|details|variants|browse|rows|recommendations)|people\/\d+|search\/people|movie-groups|series-groups|groups|movies|series)$/;
const HOME_PATH = '/v2/home';

onApiHeaders((headers) => {
  const date = Date.parse(headers.get('date') ?? '');
  if (!Number.isFinite(date) || date < takenAt) return;
  takenAt = date;
  catalog = headers.get('x-catalog-version');
  home = headers.get('x-home-version');
});

/** The `v` to add to a GET of `path` (relative to /api), or null. */
export function versionFor(path: string, params?: Record<string, unknown>): string | null {
  if (params && params.v !== undefined) return null;
  const opensTitle = (params?.movieId !== undefined && params.movieId !== null && String(params.movieId) !== '0')
    || params?.seasonId !== undefined || params?.episodeId !== undefined;
  if (opensTitle) return null;
  if (path === HOME_PATH) return home;
  return CATALOG_PATH.test(path) ? catalog : null;
}

setVersionSource(versionFor);
