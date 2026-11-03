import type { ActiveDiscoverFilters } from '@/components/organisms/discover/DiscoverFilters';

/**
 * The filters picked on Home, Movies or Series, kept when switching between them (owner
 * 2026-11-03: filters set on Home were gone on Movies). Each tab has its own DiscoverView; a
 * tab coming on screen starts from the filters set last on any of them. Same as the TV app
 * (ui/discover/SharedFilter.kt), including the genres TMDB names differently for series.
 */
let shared: ActiveDiscoverFilters = {};

const TO_SERIES: Record<string, string> = {
  Action: 'Action & Adventure',
  Adventure: 'Action & Adventure',
  'Science Fiction': 'Sci-Fi & Fantasy',
  Fantasy: 'Sci-Fi & Fantasy',
  War: 'War & Politics',
};
const TO_MOVIE: Record<string, string> = {
  'Action & Adventure': 'Action',
  'Sci-Fi & Fantasy': 'Science Fiction',
  'War & Politics': 'War',
};

export function setSharedDiscoverFilters(filters: ActiveDiscoverFilters): void {
  shared = { ...filters };
}

/** The shared filters for a view showing [type] (undefined: both). */
export function sharedDiscoverFiltersFor(type: 'movie' | 'series' | undefined): ActiveDiscoverFilters {
  const map = type === 'series' ? TO_SERIES : type === 'movie' ? TO_MOVIE : {};
  const out: ActiveDiscoverFilters = { ...shared };
  if (shared.genre?.length) {
    const seen = new Set<string>();
    out.genre = shared.genre
      .map((g) => (g.startsWith('-') ? `-${map[g.slice(1)] ?? g.slice(1)}` : map[g] ?? g))
      .filter((g) => !seen.has(g) && !!seen.add(g))
      // A genre both required and excluded after the change: required wins.
      .filter((g, _i, all) => !(g.startsWith('-') && all.includes(g.slice(1))));
  }
  // Channels are a series thing.
  if (type === 'movie') delete out.network;
  return out;
}
