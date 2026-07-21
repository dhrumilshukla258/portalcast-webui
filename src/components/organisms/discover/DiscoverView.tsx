import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Check } from 'lucide-react';
import MediaCard from '@/components/molecules/MediaCard';
import MediaCardRow from '@/components/organisms/browse/MediaCardRow';
import RecommendedRow from '@/components/organisms/browse/RecommendedRow';
import DiscoverFilters, { type DiscoverFilterKey } from '@/components/organisms/discover/DiscoverFilters';
import { getDiscoverBrowse, type DiscoverBrowseParams } from '@/api/endpoints/discover';
import { useDiscover } from '@/hooks/useDiscover';
import type { MediaItem } from '@/types';

const TOP_GENRE_COUNT = 10;
// Recommendations aren't paginated server-side (no "page" param on that
// endpoint) — this row is capped client-side since it's the only one that
// can't grow via scroll/arrow like the others below.
const RECOMMENDED_ROW_LIMIT = 14;

interface DiscoverViewProps {
  onClick: (item: MediaItem) => void;
  recommendations: MediaItem[];
  recommendationsBasedOn: string | null;
  loadingRecommendations: boolean;
  // Id of the card currently being resolved (variants check + resolve) —
  // shows a spinner on just that card so a slow click reads as "working" not
  // "broken." Owned by App.tsx since handleDiscoverItemClick lives there.
  loadingItemId?: string | null;
  // Reports the Movies/Series checkbox state up to App.tsx, whose own
  // useDiscover() instance owns "Because You Watched" — so that row can be
  // based on the most-recently-watched title of just the selected type
  // instead of always the most recent watch overall.
  onActiveTypeChange?: (type: 'movie' | 'series' | undefined) => void;
  // Reports this view's ambient-backdrop item pool up to App.tsx, which owns
  // the single shared AmbientBackdrop instance — see that component's own
  // comment for why one shared instance instead of one-per-view matters
  // (crossfade continuity across Discover/Movies/Series switches).
  onBackdropItemsChange?: (items: MediaItem[]) => void;
}

const DiscoverView: React.FC<DiscoverViewProps> = ({
  onClick,
  recommendations,
  recommendationsBasedOn,
  loadingRecommendations,
  loadingItemId,
  onActiveTypeChange,
  onBackdropItemsChange,
}) => {
  const {
    facets,
    fetchFacets,
    whatsNew,
    loadingWhatsNew,
    fetchWhatsNew,
    loadMoreWhatsNew,
    genreRows,
    fetchGenreRows,
    loadMoreGenreRow,
    clearGenreRows,
  } = useDiscover();

  // Movie/Series toggle — separate from activeFilters (genre/country/language/
  // theme) since it narrows every row's content rather than switching to the
  // single filtered-grid view those do. Both on by default (the "show
  // everything" state) — independently toggleable with a checkmark rather
  // than a single-select pill, so a user can pick "just Series" or "just
  // Movies" as well as the default "both". Only one type filters the
  // underlying fetch (undefined = no type filter = both), so both-on and
  // both-off collapse to the same "show everything" behavior rather than
  // both-off showing nothing.
  const [showMovies, setShowMovies] = useState(true);
  const [showSeries, setShowSeries] = useState(true);
  const activeType = showMovies === showSeries ? undefined : showMovies ? 'movie' : 'series';

  const [activeFilters, setActiveFilters] = useState<Pick<DiscoverBrowseParams, DiscoverFilterKey>>({});
  const [loadingFiltered, setLoadingFiltered] = useState(false);

  const hasActiveFilter = Object.values(activeFilters).some(Boolean);

  // Results are cached per filter-combo (+ type), not just held as a single
  // "current" array — so switching Action -> Comedy -> back to Action
  // re-renders the already-fetched Action pages instantly from memory
  // instead of re-hitting the server for pages it already has. Session-only
  // (component state, not persisted) — a stale entry just means one extra
  // fetch next session, not wrong data shown.
  const filterCacheKeyOf = useCallback(
    (filters: Pick<DiscoverBrowseParams, DiscoverFilterKey>) =>
      `${activeType ?? 'all'}:${filters.genre || ''}:${filters.country || ''}:${filters.language || ''}:${filters.theme || ''}`,
    [activeType]
  );
  const [filteredCache, setFilteredCache] = useState<
    Record<string, { items: MediaItem[]; total: number; page: number }>
  >({});
  // LRU order of cache keys (most-recently-used last) — free-scrolling
  // through every genre/country/language combo in one sitting would
  // otherwise grow filteredCache unbounded for the length of the session.
  // Bumped on every cache write (new key or a "load more" page append to an
  // existing key); a new key past the cap evicts the least-recently-used one.
  const filteredCacheOrderRef = useRef<string[]>([]);
  const FILTERED_CACHE_MAX_ENTRIES = 20;
  const activeFilterKey = filterCacheKeyOf(activeFilters);
  const filteredEntry = filteredCache[activeFilterKey];
  const filteredItems = filteredEntry?.items ?? [];
  const filteredTotal = filteredEntry?.total ?? 0;
  const filteredPage = filteredEntry?.page ?? 1;

  // Same stale-response guard pattern as useMediaLibrary's fetchRequestRef /
  // useDiscover's browseRequestRef — without it, a slower response for a
  // filter/page the user has already moved on from can land after a faster
  // later one and overwrite it with stale data, or a double "Load More"
  // click can append the same page twice.
  const filteredRequestRef = useRef(0);

  useEffect(() => {
    fetchFacets(activeType);
    fetchWhatsNew(activeType);
  }, [activeType, fetchFacets, fetchWhatsNew]);

  useEffect(() => {
    onActiveTypeChange?.(activeType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType]);

  useEffect(() => {
    if (!facets || facets.genres.length === 0) return;
    clearGenreRows();
    fetchGenreRows(facets.genres.slice(0, TOP_GENRE_COUNT).map((g) => g.value), activeType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facets, fetchGenreRows]);

  const runFilteredBrowse = useCallback(
    async (filters: Pick<DiscoverBrowseParams, DiscoverFilterKey>, page: number, opts?: { force?: boolean }) => {
      const cacheKey = filterCacheKeyOf(filters);
      // Page 1 of a filter-combo already sitting in the cache (e.g. the user
      // switched back to a genre they already browsed) renders instantly
      // without hitting the server at all — force it anyway when the
      // Movie/Series toggle changed underneath an already-cached entry, since
      // that invalidates it.
      if (page === 1 && !opts?.force && filteredCache[cacheKey]) return;
      const requestId = ++filteredRequestRef.current;
      setLoadingFiltered(true);
      try {
        const response = await getDiscoverBrowse({ ...filters, type: activeType, page });
        if (filteredRequestRef.current !== requestId) return; // a newer request already superseded this one
        // Touch this key as most-recently-used, then evict the LRU entry if
        // adding a brand-new key pushed us past the cap.
        const order = filteredCacheOrderRef.current.filter((k) => k !== cacheKey);
        order.push(cacheKey);
        let evictKey: string | undefined;
        if (order.length > FILTERED_CACHE_MAX_ENTRIES) evictKey = order.shift();
        filteredCacheOrderRef.current = order;
        setFilteredCache((prev) => {
          const prevItems = page === 1 ? [] : prev[cacheKey]?.items ?? [];
          const next = {
            ...prev,
            [cacheKey]: { items: [...prevItems, ...response.data], total: response.total_items, page },
          };
          if (evictKey) delete next[evictKey];
          return next;
        });
      } catch (err) {
        console.error('Failed to load filtered discover results', err);
      } finally {
        if (filteredRequestRef.current === requestId) setLoadingFiltered(false);
      }
    },
    [activeType, filterCacheKeyOf, filteredCache]
  );

  const handleFilterChange = useCallback(
    (key: DiscoverFilterKey, value: string | undefined) => {
      const next = { ...activeFilters, [key]: value };
      setActiveFilters(next);
      const anyActive = Object.values(next).some(Boolean);
      if (anyActive) {
        runFilteredBrowse(next, 1);
      } else {
        // Invalidate any still-in-flight request for the filter(s) just
        // cleared so its response can't land later and repopulate the
        // filtered grid after it's already been hidden. The cache itself is
        // left alone — clearing filters doesn't mean forgetting what was
        // already fetched, so re-selecting the same combo later still hits
        // the cache.
        filteredRequestRef.current++;
      }
    },
    [activeFilters, runFilteredBrowse]
  );

  const handleLoadMore = useCallback(() => {
    if (loadingFiltered) return; // avoid a double-click firing a duplicate page fetch
    runFilteredBrowse(activeFilters, filteredPage + 1);
  }, [activeFilters, filteredPage, loadingFiltered, runFilteredBrowse]);

  // Auto-loads the next page on scroll instead of requiring a manual "Load
  // More" click — same pattern MainContentGrid/useMediaLibrary already use
  // for the regular Movies/Series grid (scroll-near-bottom on the shared
  // #app-content-scroll pane triggers the next page), so filtered Discover
  // browsing behaves consistently with everywhere else in the app.
  useEffect(() => {
    if (!hasActiveFilter) return;
    const pane = document.getElementById('app-content-scroll');
    if (!pane) return;
    const handleScroll = () => {
      const buffer = 200;
      const isNearBottom = pane.scrollTop + pane.clientHeight >= pane.scrollHeight - buffer;
      if (isNearBottom && !loadingFiltered && filteredItems.length < filteredTotal) {
        handleLoadMore();
      }
    };
    pane.addEventListener('scroll', handleScroll);
    return () => pane.removeEventListener('scroll', handleScroll);
  }, [hasActiveFilter, loadingFiltered, filteredItems.length, filteredTotal, handleLoadMore]);

  // Re-run the active genre/country/etc. filter against the new type when the
  // Movie/Series toggle changes while the filtered grid is showing — without
  // this, switching types would leave stale results from the other type on
  // screen until the user touched a filter again.
  useEffect(() => {
    if (!hasActiveFilter) return;
    runFilteredBrowse(activeFilters, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType]);

  // Item pool for the ambient backdrop — whatever's actually on screen right
  // now: the filtered grid when a filter's active, otherwise a mix of
  // Recommended/What's New/genre-row items so the backdrop isn't always
  // anchored to just one row.
  const backdropItems = useMemo(() => {
    if (hasActiveFilter) return filteredItems;
    return [
      ...recommendations,
      ...whatsNew.items,
      ...Object.values(genreRows).flatMap((row) => row.items),
    ];
  }, [hasActiveFilter, filteredItems, recommendations, whatsNew.items, genreRows]);

  // Deferred to a rAF instead of reporting synchronously on every
  // `backdropItems` change: each of the ~9 genre rows resolves its own fetch
  // independently and updates genreRows separately, so a fresh Discover
  // mount can recompute backdropItems ~9 times back-to-back — and when those
  // fetches resolve from server cache in ~0-1ms each, all 9 calls into the
  // parent's setDiscoverBackdropItems happen before the browser ever gets a
  // chance to paint. React counts that as nested updates that never settle
  // and throws "Maximum update depth exceeded" (error #185), same as the
  // auto-load-more cascade this mirrors in MediaCardRow. Coalescing to one
  // report per frame fixes it without changing what's actually reported.
  const backdropReportRaf = useRef<number | null>(null);
  useEffect(() => {
    if (backdropReportRaf.current !== null) cancelAnimationFrame(backdropReportRaf.current);
    backdropReportRaf.current = requestAnimationFrame(() => {
      backdropReportRaf.current = null;
      onBackdropItemsChange?.(backdropItems);
    });
    return () => {
      if (backdropReportRaf.current !== null) cancelAnimationFrame(backdropReportRaf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backdropItems]);

  return (
    <div id="app-content-scroll" className="custom-scrollbar h-full min-h-0 flex-1 overflow-y-auto content-transition px-2 sm:px-0">
      {/* No backdrop-blur anywhere in this bar (or its buttons) on purpose —
          AmbientBackdrop now blurs its image at the source (filter:blur() on
          the <img> itself, a one-time cost), so a foreground panel doesn't
          need its own backdrop-filter to look right against it. This also
          eliminates Chromium's nested-backdrop-filter compositing bug that
          caused the sticky-bar flicker — there's no backdrop-filter left
          here to nest. */}
      <div className="sticky top-0 z-30 mb-4 flex items-center gap-2 rounded-2xl bg-black/80 px-2 py-2">
        <DiscoverFilters facets={facets} activeFilters={activeFilters} onFilterChange={handleFilterChange} />
        {(['movie', 'series'] as const).map((t) => {
          const isActive = t === 'movie' ? showMovies : showSeries;
          return (
            <button
              key={t}
              data-focusable="true"
              onClick={() => {
                // Unselecting both doesn't have a sensible meaning here (it
                // isn't "show neither" anywhere in this UI) — block turning
                // off the last remaining one instead of silently falling
                // back to "show everything" behind the user's back.
                if (t === 'movie') {
                  if (showMovies && !showSeries) return;
                  setShowMovies((v) => !v);
                } else {
                  if (showSeries && !showMovies) return;
                  setShowSeries((v) => !v);
                }
              }}
              className={`flex h-10 flex-shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-bold capitalize transition-all focus:outline-none focus:ring-1 focus:ring-portalcast-light [&.focused]:ring-1 [&.focused]:ring-portalcast-light ${
                isActive
                  ? 'border-transparent bg-gradient-to-r from-sky-400 to-blue-500 text-white'
                  : 'border-white/10 bg-[#0b1120]/85 text-gray-300 hover:border-white/20 hover:text-white'
              }`}
            >
              {isActive && <Check size={14} />}
              {t === 'movie' ? 'Movies' : 'Series'}
            </button>
          );
        })}
      </div>

      {/* Keyed on activeType (plus hasActiveFilter, since that swaps to an
          entirely different layout) so switching Movies/Series or clearing a
          filter re-triggers content-transition's fade+scale instead of the
          rows just instantly swapping content in place — same animation
          MainContentGrid already uses for page navigation. */}
      <div key={`${activeType ?? 'all'}_${hasActiveFilter}`} className="content-transition">
      {hasActiveFilter ? (
        <>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 md:gap-6 lg:grid-cols-6 xl:grid-cols-7">
            {filteredItems.map((item, index) => (
              <MediaCard key={`${item.id}-${index}`} item={item} onClick={onClick} isLoading={loadingItemId === item.id} />
            ))}
          </div>
          {!loadingFiltered && filteredItems.length === 0 && (
            <p className="mt-10 text-center text-gray-400">No titles match these filters.</p>
          )}
          {/* Loading indicator only — the next page loads automatically on
              scroll (see the scroll listener effect above), same as the
              regular Movies/Series grid, no manual "Load More" click needed. */}
          {loadingFiltered && (
            <div className="flex w-full justify-center py-8">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
            </div>
          )}
        </>
      ) : (
        <>
          <RecommendedRow
            onClick={onClick}
            items={recommendations.slice(0, RECOMMENDED_ROW_LIMIT)}
            loading={loadingRecommendations}
            basedOnTitle={recommendationsBasedOn}
            loadingItemId={loadingItemId}
          />
          <MediaCardRow
            title="What's New"
            onClick={onClick}
            items={whatsNew.items}
            loading={loadingWhatsNew}
            loadingItemId={loadingItemId}
            hasMore={whatsNew.hasMore}
            loadingMore={whatsNew.loadingMore}
            onLoadMore={() => loadMoreWhatsNew(activeType)}
          />
          {/* Each genre row renders as soon as its own fetch resolves (see
              fetchGenreRows) — rows appear progressively instead of all
              waiting on the slowest one. Grows via scroll/arrow instead of
              being capped to one page (see MediaCardRow's onLoadMore). */}
          {Object.entries(genreRows).map(([genre, row]) => (
            <MediaCardRow
              key={genre}
              title={genre}
              onClick={onClick}
              items={row.items}
              loading={false}
              loadingItemId={loadingItemId}
              hasMore={row.hasMore}
              loadingMore={row.loadingMore}
              onLoadMore={() => loadMoreGenreRow(genre, activeType)}
            />
          ))}
        </>
      )}
      </div>
    </div>
  );
};

export default DiscoverView;
