import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getFacets,
  getDiscoverBrowse,
  getRecommendations,
} from '@/api/endpoints/discover';
import type { DiscoverFacets } from '@/api/endpoints/discover';
import type { MediaItem } from '@/types';

export interface DiscoverRowState {
  items: MediaItem[];
  page: number;
  hasMore: boolean;
  loadingMore: boolean;
}

const EMPTY_ROW: DiscoverRowState = { items: [], page: 1, hasMore: false, loadingMore: false };

// Sibling to useMediaLibrary.ts rather than folded into it — Discover (facets/browse-by-
// filter/recommendations) is a separate concern from the core content-type/pagination
// state machine useMediaLibrary already manages, and that hook is large enough that adding
// more interdependent state to it risks the kind of effect-ordering bugs documented inline
// there (see restoredForRef comment).
export function useDiscover() {
  const { user } = useAuth();

  const [facets, setFacets] = useState<DiscoverFacets | null>(null);
  const [loadingFacets, setLoadingFacets] = useState(false);

  const [recommendations, setRecommendations] = useState<MediaItem[]>([]);
  const [recommendationsBasedOn, setRecommendationsBasedOn] = useState<string | null>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const [whatsNew, setWhatsNew] = useState<DiscoverRowState>(EMPTY_ROW);
  const [loadingWhatsNew, setLoadingWhatsNew] = useState(false);

  const [genreRows, setGenreRows] = useState<Record<string, DiscoverRowState>>({});

  // Rows are appended to via loadMore*, which needs to read the CURRENT page/
  // hasMore/loadingMore at call time (e.g. from a scroll handler or arrow
  // click) without stale-closure issues — mirrored refs let the load-more
  // callbacks stay referentially stable (empty deps) while still reading
  // fresh state.
  const whatsNewRef = useRef(whatsNew);
  useEffect(() => { whatsNewRef.current = whatsNew; }, [whatsNew]);
  const genreRowsRef = useRef(genreRows);
  useEffect(() => { genreRowsRef.current = genreRows; }, [genreRows]);

  const fetchFacets = useCallback(async (type?: 'movie' | 'series') => {
    setLoadingFacets(true);
    try {
      const result = await getFacets(type);
      setFacets(result);
    } catch (err) {
      console.error('Failed to load discover facets', err);
    } finally {
      setLoadingFacets(false);
    }
  }, []);

  const fetchRecommendations = useCallback(async (type?: 'movie' | 'series') => {
    if (!user) return;
    setLoadingRecommendations(true);
    try {
      const { items, basedOnTitle } = await getRecommendations(type);
      setRecommendations(items);
      setRecommendationsBasedOn(basedOnTitle);
    } catch (err) {
      console.error('Failed to load recommendations', err);
    } finally {
      setLoadingRecommendations(false);
    }
  }, [user]);

  const fetchWhatsNew = useCallback(async (type?: 'movie' | 'series') => {
    setLoadingWhatsNew(true);
    try {
      const response = await getDiscoverBrowse({ type, page: 1 });
      setWhatsNew({
        items: response.data,
        page: 1,
        hasMore: response.data.length < response.total_items,
        loadingMore: false,
      });
    } catch (err) {
      console.error('Failed to load what\'s new', err);
    } finally {
      setLoadingWhatsNew(false);
    }
  }, []);

  const loadMoreWhatsNew = useCallback((type?: 'movie' | 'series') => {
    const row = whatsNewRef.current;
    if (row.loadingMore || !row.hasMore) return;
    setWhatsNew((prev) => ({ ...prev, loadingMore: true }));
    const nextPage = row.page + 1;
    getDiscoverBrowse({ type, page: nextPage })
      .then((response) => {
        setWhatsNew((prev) => {
          const items = [...prev.items, ...response.data];
          return { items, page: nextPage, hasMore: items.length < response.total_items, loadingMore: false };
        });
      })
      .catch((err) => {
        console.error('Failed to load more of What\'s New', err);
        setWhatsNew((prev) => ({ ...prev, loadingMore: false }));
      });
  }, []);

  // Each genre fetched independently and merged into genreRows as soon as it
  // resolves, instead of batching all of them behind one Promise.all — a
  // single slow genre no longer blocks every other row from appearing, so
  // rows render progressively (fast ones first) rather than all-at-once
  // whenever the slowest one finally finishes.
  //
  // Capped to a small worker pool instead of firing all genres at once: the
  // server's sqlite3 driver runs queries on Node's libuv threadpool (default
  // size 4), shared with every other async I/O op on the process — opening
  // Discover previously fired ~11 concurrent queries (facets' 4 sub-queries +
  // What's New + up to 6 genres), enough to saturate that pool and stall
  // unrelated requests (including active stream playback) until they cleared.
  const GENRE_FETCH_CONCURRENCY = 2;
  const fetchGenreRows = useCallback((genres: string[], type?: 'movie' | 'series') => {
    let nextIndex = 0;
    const runNext = () => {
      const i = nextIndex++;
      if (i >= genres.length) return;
      const genre = genres[i];
      getDiscoverBrowse({ genre, type, page: 1 })
        .then((response) => {
          setGenreRows((prev) => ({
            ...prev,
            [genre]: {
              items: response.data,
              page: 1,
              hasMore: response.data.length < response.total_items,
              loadingMore: false,
            },
          }));
        })
        .catch((err) => {
          console.error(`Failed to load genre row "${genre}"`, err);
        })
        .finally(runNext);
    };
    for (let w = 0; w < Math.min(GENRE_FETCH_CONCURRENCY, genres.length); w++) runNext();
  }, []);

  const loadMoreGenreRow = useCallback((genre: string, type?: 'movie' | 'series') => {
    const row = genreRowsRef.current[genre];
    if (!row || row.loadingMore || !row.hasMore) return;
    setGenreRows((prev) => ({ ...prev, [genre]: { ...prev[genre], loadingMore: true } }));
    const nextPage = row.page + 1;
    getDiscoverBrowse({ genre, type, page: nextPage })
      .then((response) => {
        setGenreRows((prev) => {
          const existing = prev[genre];
          if (!existing) return prev;
          const items = [...existing.items, ...response.data];
          return {
            ...prev,
            [genre]: { items, page: nextPage, hasMore: items.length < response.total_items, loadingMore: false },
          };
        });
      })
      .catch((err) => {
        console.error(`Failed to load more of genre row "${genre}"`, err);
        setGenreRows((prev) => (prev[genre] ? { ...prev, [genre]: { ...prev[genre], loadingMore: false } } : prev));
      });
  }, []);

  return {
    facets,
    loadingFacets,
    fetchFacets,
    recommendations,
    recommendationsBasedOn,
    loadingRecommendations,
    fetchRecommendations,
    whatsNew,
    loadingWhatsNew,
    fetchWhatsNew,
    loadMoreWhatsNew,
    genreRows,
    fetchGenreRows,
    loadMoreGenreRow,
    clearGenreRows: useCallback(() => setGenreRows({}), []),
  };
}
