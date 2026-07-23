import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Check } from 'lucide-react';
import MediaCard from '@/components/molecules/MediaCard';
import MediaCardRow from '@/components/organisms/browse/MediaCardRow';
import RecommendedRow from '@/components/organisms/browse/RecommendedRow';
import DiscoverFilters, { type ActiveDiscoverFilters } from '@/components/organisms/discover/DiscoverFilters';
import { getDiscoverBrowse } from '@/api/endpoints/discover';
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
  // comment for why one shared instance instead of one-per-view matters.
  // App.tsx only ever merges these reports into its running pool, never
  // replaces it — the backdrop is meant to be one continuous rotation no
  // section, filter, or remount ever resets (see the merge comment there).
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
    beginGenreRefresh,
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

  const [activeFilters, setActiveFilters] = useState<ActiveDiscoverFilters>({});
  const [loadingFiltered, setLoadingFiltered] = useState(false);

  const hasActiveFilter =
    (activeFilters.genre?.length ?? 0) > 0 || !!activeFilters.country || !!activeFilters.language || !!activeFilters.theme;

  // Results are cached per filter-combo (+ type), not just held as a single
  // "current" array — so switching Action -> Comedy -> back to Action
  // re-renders the already-fetched Action pages instantly from memory
  // instead of re-hitting the server for pages it already has. Session-only
  // (component state, not persisted) — a stale entry just means one extra
  // fetch next session, not wrong data shown. Genre list is sorted+joined so
  // selecting Comedy then Drama hits the same cache entry as Drama then
  // Comedy (same combo, different click order).
  const filterCacheKeyOf = useCallback(
    (filters: ActiveDiscoverFilters) =>
      `${activeType ?? 'all'}:${[...(filters.genre || [])].sort().join('+')}:${filters.country || ''}:${filters.language || ''}:${filters.theme || ''}`,
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
    const targetGenres = facets.genres.slice(0, TOP_GENRE_COUNT).map((g) => g.value);
    beginGenreRefresh(targetGenres);
    fetchGenreRows(targetGenres, activeType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facets, fetchGenreRows]);

  const runFilteredBrowse = useCallback(
    async (filters: ActiveDiscoverFilters, page: number, opts?: { force?: boolean }) => {
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
        // genre is an array client-side (multi-select) but the API takes one
        // comma-separated value, same convention as the AND-intersection the
        // server already does across genre/country/theme (see
        // routes/discover/index.ts's tagFilters).
        const response = await getDiscoverBrowse({
          genre: filters.genre?.length ? filters.genre.join(',') : undefined,
          country: filters.country,
          language: filters.language,
          theme: filters.theme,
          type: activeType,
          page,
        });
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

  // Shared by both handlers below — same "did this leave any filter still
  // active" branch (fetch vs. just invalidate any in-flight stale request).
  const applyNextFilters = useCallback(
    (next: ActiveDiscoverFilters) => {
      setActiveFilters(next);
      const anyActive = (next.genre?.length ?? 0) > 0 || !!next.country || !!next.language || !!next.theme;
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
    [runFilteredBrowse]
  );

  const handleFilterChange = useCallback(
    (key: 'country' | 'language' | 'theme', value: string | undefined) => {
      applyNextFilters({ ...activeFilters, [key]: value });
    },
    [activeFilters, applyNextFilters]
  );

  const handleGenresChange = useCallback(
    (values: string[]) => {
      applyNextFilters({ ...activeFilters, genre: values });
    },
    [activeFilters, applyNextFilters]
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

  // Debounced instead of reporting synchronously on every `backdropItems`
  // change: each of the ~9 genre rows resolves its own fetch independently
  // and updates genreRows separately, so a fresh Discover mount recomputes
  // backdropItems ~9+ times in quick succession as each one lands. A single
  // rAF only coalesces updates landing within the same frame — genre rows
  // typically resolve a few ms to a few hundred ms apart (separate network
  // responses), each one still slipping through as its own report and
  // re-triggering AmbientBackdrop's reveal crossfade, which read as the
  // backdrop flickering through several images right after opening Discover.
  // A short timeout window collapses that whole initial burst into one
  // report instead. (A too-short window here reintroduces the original
  // "Maximum update depth exceeded" #185 crash this used to guard against —
  // keep it above a single frame.)
  const backdropReportTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (backdropReportTimer.current !== null) clearTimeout(backdropReportTimer.current);
    backdropReportTimer.current = setTimeout(() => {
      backdropReportTimer.current = null;
      onBackdropItemsChange?.(backdropItems);
    }, 400);
    return () => {
      if (backdropReportTimer.current !== null) clearTimeout(backdropReportTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backdropItems]);

  // Keyed on activeType + hasActiveFilter so switching Movies/Series or
  // clearing a filter re-triggers content-transition's fade+scale instead of
  // rows instantly swapping content in place — same fade MainContentGrid
  // already uses when switching the Movies/Series section itself.
  const contentKey = `${activeType ?? 'all'}_${hasActiveFilter}`;
  const contentNode = hasActiveFilter ? (
    <>
      {/* A genuinely new filter combo (nothing cached for it yet) shows a
          skeleton grid instead of switching straight from "Action's real
          tiles" to "zero tiles, spinner below" — same empty-then-pop the
          genre rows had before beginGenreRefresh, just here it's a filter
          pick (Action -> Comedy) rather than a Movies/Series toggle. Real
          tiles fade in over it once this combo's page 1 resolves (see
          row-content-fade-in). A combo already in filteredCache (revisiting
          a genre browsed earlier this session) skips straight to real
          tiles — nothing to skeleton, they're already there. */}
      {filteredItems.length > 0 && (
        <div className="row-content-fade-in grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 md:gap-6 lg:grid-cols-6 xl:grid-cols-7">
          {filteredItems.map((item, index) => (
            <MediaCard key={`${item.id}-${index}`} item={item} onClick={onClick} isLoading={loadingItemId === item.id} />
          ))}
        </div>
      )}
      {loadingFiltered && filteredItems.length === 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 md:gap-6 lg:grid-cols-6 xl:grid-cols-7">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="aspect-2/3 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      )}
      {!loadingFiltered && filteredItems.length === 0 && (
        <p className="mt-10 text-center text-gray-400">No titles match these filters.</p>
      )}
      {/* Loading indicator only for a "load more" fetch (items already on
          screen) — the next page loads automatically on scroll (see the
          scroll listener effect above), same as the regular Movies/Series
          grid, no manual "Load More" click needed. */}
      {loadingFiltered && filteredItems.length > 0 && (
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
          being capped to one page (see MediaCardRow's onLoadMore).
          `loading={row.loading}` is what puts a row into its skeleton state
          the instant a Movies/Series switch invalidates it (see
          beginGenreRefresh) — the row stays mounted throughout, it's just
          showing a placeholder until this genre's fetch for the new type
          resolves. */}
      {Object.entries(genreRows).map(([genre, row]) => (
        <MediaCardRow
          key={genre}
          title={genre}
          onClick={onClick}
          items={row.items}
          loading={!!row.loading}
          loadingItemId={loadingItemId}
          hasMore={row.hasMore}
          loadingMore={row.loadingMore}
          onLoadMore={() => loadMoreGenreRow(genre, activeType)}
        />
      ))}
    </>
  );

  return (
    <div id="app-content-scroll" className="custom-scrollbar h-full min-h-0 flex-1 overflow-y-auto content-transition px-2 sm:px-0">
      {/* No backdrop-blur-sm anywhere in this bar (or its buttons) on purpose —
          AmbientBackdrop now blurs its image at the source (filter:blur() on
          the <img> itself, a one-time cost), so a foreground panel doesn't
          need its own backdrop-filter to look right against it. This also
          eliminates Chromium's nested-backdrop-filter compositing bug that
          caused the sticky-bar flicker — there's no backdrop-filter left
          here to nest. */}
      <div className="sticky top-0 z-30 mb-4 flex items-center gap-2 rounded-2xl bg-black/80 px-2 py-2">
        <DiscoverFilters
          facets={facets}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onGenresChange={handleGenresChange}
        />
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
              className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-bold capitalize transition-all focus:outline-hidden focus:ring-1 focus:ring-portalcast-light [&.focused]:ring-1 [&.focused]:ring-portalcast-light ${
                isActive
                  ? 'border-transparent bg-linear-to-r from-sky-400 to-blue-500 text-white'
                  : 'border-white/10 bg-[#0b1120]/85 text-gray-300 hover:border-white/20 hover:text-white'
              }`}
            >
              {isActive && <Check size={14} />}
              {t === 'movie' ? 'Movies' : 'Series'}
            </button>
          );
        })}
      </div>

      <div key={contentKey} className="content-transition">
        {contentNode}
      </div>
    </div>
  );
};

export default DiscoverView;
