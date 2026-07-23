import { useState, useCallback, useRef, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/api/client';
import { getChannels, getChannelGroups } from '@/api/endpoints/channels';
import { getMedia, getMovieCategories } from '@/api/endpoints/movies';
import { getSeries, getSeriesCategories } from '@/api/endpoints/series';
import { getEPG } from '@/api/endpoints/epg';
import { getCarouselSlides, type CarouselSlide } from '@/api/endpoints/carousel';
import { clearUserProgress, getUserProgress } from '@/api/endpoints/user';
import type { ProgressRecord } from '@/api/types/user';
import type { MediaItem, ContextType, EPG_List, ChannelGroup } from '@/types';
import type { PaginatedResponse } from '@/api/types/channels';
import { isTizenDevice } from '@/utils/helpers';
import { useLibraryBackgroundRefresh } from './useLibraryBackgroundRefresh';
import { useInfiniteScroll } from './useInfiniteScroll';

export const getInitialState = (): {
  initialType: 'movie' | 'series' | 'tv';
  initialTitle: string;
  initialCategory: string | null;
} => {
  return {
    initialType: 'movie',
    initialTitle: 'Movies',
    initialCategory: '*',
  };
};

const { initialType, initialTitle, initialCategory } = getInitialState();

export const initialContext: ContextType = {
  page: 1,
  pageAtaTime: 1,
  search: '',
  category: initialCategory,
  movieId: null,
  seasonId: null,
  parentTitle: initialTitle,
  focusedIndex: null,
  contentType: initialType,
  sort: 'latest',
};

// Infinite-scroll append caps out here instead of growing without bound —
// each "load more" page keeps getting appended to `items` for as long as the
// user keeps scrolling a single category, and nothing ever trimmed it. A
// true windowed/virtualized grid would be the complete fix, but this app's
// Smart TV remote navigation (useTVFocus.ts) walks the actual DOM to find
// focusable elements, so unmounting off-screen items would silently break
// remote-control navigation for anything scrolled out of view. Capping the
// retained list is the safe middle ground: it bounds memory for pathological
// long-scroll sessions without touching what's actually mounted/focusable.
// The cap is generous — far more items than a typical browse session loads —
// so it only kicks in for genuinely long scrolling, and trims from the
// front (oldest-loaded) so the just-loaded page a "load more" scroll is
// chasing always stays.
const MAX_RETAINED_ITEMS = 600;

function appendPageCapped(prev: MediaItem[], uniqueNew: MediaItem[]): MediaItem[] {
  const combined = [...prev, ...uniqueNew];
  return combined.length > MAX_RETAINED_ITEMS
    ? combined.slice(combined.length - MAX_RETAINED_ITEMS)
    : combined;
}

// Was duplicated identically in the movie and series branches of fetchData's
// pagination handling — same page-1-replaces-all-else-dedup-and-append logic
// for both.
function mergePageResults(
  prev: MediaItem[],
  page: number,
  responseData: MediaItem[],
  setTotalItemsCount: React.Dispatch<React.SetStateAction<number>>
): MediaItem[] {
  if (page === 1) return responseData;

  const existingIds = new Set(prev.map((item) => item.id));
  const uniqueNew = responseData.filter((item) => !existingIds.has(item.id));

  if (uniqueNew.length === 0) {
    setTimeout(() => setTotalItemsCount(prev.length), 0);
  }
  return appendPageCapped(prev || [], uniqueNew);
}

export function useMediaLibrary(isDetailOpen: boolean = false) {
  const { user, updatePreferences } = useAuth();
  const [context, setContext] = useState<ContextType>(initialContext);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [totalItemsCount, setTotalItemsCount] = useState<number>(0);
  const [contentType, setContentType] = useState<'movie' | 'series' | 'tv'>(
    initialType
  );
  const [isPortal, setIsPortal] = useState(false);
  const [epgData, setEpgData] = useState<Record<string, EPG_List[]>>({});
  const [channelGroups, setChannelGroups] = useState<ChannelGroup[]>([]);
  const [cwRefreshKey, setCwRefreshKey] = useState(0);
  const [playLastTvChannel, setPlayLastTvChannel] = useState<string | null>(
    null
  );
  const isTizen = isTizenDevice();

  const [vodCategories, setVodCategories] = useState<ChannelGroup[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(false);
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[]>([]);
  const [providerKey, setProviderKey] = useState<string>('');

  // Channels/groups don't need to be refetched every time the user switches
  // to the TV tab — unlike movies/series (paginated, small first request),
  // TV always pulls the *entire* catalog in one shot, so it's the slowest
  // tab to (re)land on. Cache it for the session per provider so only the
  // first visit pays that cost; switching away and back is instant.
  const channelsCacheRef = useRef<{
    providerKey: string;
    channels: MediaItem[];
    groups: ChannelGroup[];
  } | null>(null);

  const fetchProviderKey = useCallback(async () => {
    try {
      const response = await api.get<{ hostname?: string; providerType?: string }>('/config');
      const host = response.data.hostname || 'default_host';
      const type = response.data.providerType || 'stalker';
      setProviderKey(`${type}_${host}`);
    } catch (err) {
      console.error('Failed to load active provider config:', err);
    }
  }, []);

  const fetchVodCategories = useCallback(async (type: 'movie' | 'series') => {
    // Same stale-response guard as fetchData's fetchRequestRef (see its own
    // comment) — without it, a Movies fetch and a lingering Series fetch
    // (e.g. still in flight from just before switching sections) can land
    // out of order, and the later-arriving Series response silently
    // overwrites vodCategories back to Series' category ids while
    // contentType is already 'movie'. Clicking a category during that
    // window then sends a Series category id under contentType='movie',
    // which the server can't match to a real movie category.
    const requestId = ++categoriesRequestRef.current;
    setLoadingCategories(true);
    try {
      const response =
        type === 'movie'
          ? await getMovieCategories()
          : await getSeriesCategories();
      if (categoriesRequestRef.current !== requestId) return;
      const allItem: ChannelGroup = { id: '*', title: 'ALL' };
      setVodCategories([allItem, ...response.data]);
    } catch (err) {
      console.error('Failed to load categories', err);
    } finally {
      if (categoriesRequestRef.current === requestId) setLoadingCategories(false);
    }
  }, []);

  const fetchCarousel = useCallback(async () => {
    try {
      const slides = await getCarouselSlides();
      setCarouselSlides(slides.sort((a, b) => (a.order || 0) - (b.order || 0)));
    } catch (err) {
      console.error('Failed to load carousel slides', err);
    }
  }, []);

  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentChannels, setRecentChannels] = useState<string[]>([]);

  // Restoring the user's last-browsed category/content-type used to be a
  // separate effect from the one that actually fetches the initial content
  // — it only set `contentType`/`context` state, it never called
  // fetchData(). If that effect's resolution of `preferredContentType`
  // differed from whatever the (also separate) initial-fetch effect had
  // resolved moments earlier — e.g. the initial fetch fired before
  // `user.preferences` was fully attached and fell back to 'movie', then
  // this one corrected the label to the user's real 'tv' preference — the
  // two would disagree: the header/nav would show "TV" while `items` still
  // held whatever the fallback fetch loaded (movies), because nothing ever
  // re-fetched to match the corrected label. See the merged effect below
  // (search "Initial Load"), which now sets state AND fetches atomically —
  // there's no window where they can show different content types anymore.
  const restoredForRef = useRef<string | null>(null);

  const [progressRecords, setInProgressRecords] = useState<ProgressRecord[]>([]);

  const fetchProgress = useCallback(async () => {
    try {
      const records = await getUserProgress();
      setInProgressRecords(records);
    } catch (err) {
      console.error('Failed to load user progress:', err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchProgress();
    }
  }, [user?.id, fetchProgress, cwRefreshKey]);

  const isFetchingMore = useRef(false);
  const isRestoringFromHistory = useRef(false);
  // Guards against out-of-order network responses: if the user switches
  // category/page fast enough, an older request can resolve *after* a newer
  // one and clobber its state with stale data (e.g. a "4K Hindi" response
  // landing after a "4K English" click, showing Hindi titles under the
  // English category). Every fetchData call stamps its own id; only the
  // call whose id is still the latest by the time its response lands is
  // allowed to commit state.
  const fetchRequestRef = useRef(0);
  // Guards fetchVodCategories the same way — see its own comment.
  const categoriesRequestRef = useRef(0);

  const loadEpgData = useCallback(async () => {
    try {
      const response = await getEPG();
      if (response.data?.data) setEpgData(response.data.data);
    } catch {
      toast.warn('Could not load program guide.');
    }
  }, []);

  const fetchData = useCallback(
    async (
      newContext: ContextType,
      typeOverride?: 'movie' | 'series' | 'tv'
    ) => {
      if (isRestoringFromHistory.current) {
        return;
      }
      const requestId = ++fetchRequestRef.current;
      const isStale = () => fetchRequestRef.current !== requestId;

      const currentContentType = typeOverride || contentType;
      setLoading(true);
      setError(null);
      setPaginationError(null);

      if (newContext.page === 1) {
        setItems([]);
        setTotalItemsCount(0);
      }

      // Set context immediately, not after the fetch resolves — components
      // like MainContentGrid decide which page to render (e.g. season list vs
      // episode list) based on context fields (seasonId, movieId, etc.), so a
      // late setContext left the tree rendering the *previous* page's data
      // against the *new* loading/items state for the whole fetch duration,
      // flashing an empty/wrong view until the response landed.
      setContext(newContext);

      // Safety net against a request that never resolves or rejects (a
      // hung/unresponsive backend endpoint) — without this, `loading` would
      // stay true forever and the UI would show a permanent spinner with no
      // way out. This doesn't fix a slow/stuck backend, it just guarantees
      // the failure becomes visible (an error + retry option) instead of an
      // infinite spinner.
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), 20000);

      try {
        let response: PaginatedResponse<MediaItem>;

        if (currentContentType === 'movie') {
          const params = {
            page: newContext.page,
            search: newContext.search,
            pageAtaTime: 1,
            category: newContext.category,
            movieId: newContext.movieId,
            seasonId: newContext.seasonId,
            sort: newContext.sort,
          };
          response = await getMedia(params, timeoutController.signal);
          if (isStale()) return;
          const responseData = response.data || [];
          setItems((prev) => mergePageResults(prev, newContext.page, responseData, setTotalItemsCount));
          if (responseData.length > 0 && response.total_items) {
            setTotalItemsCount(response.total_items);
          } else if (newContext.page === 1) {
            setTotalItemsCount(0);
          }
          if (response.isPortal !== undefined) setIsPortal(response.isPortal);
        } else if (currentContentType === 'series') {
          if (newContext.seasonId && newContext.movieId) {
            response = await getSeries({
              movieId: newContext.movieId,
              seasonId: newContext.seasonId,
              page: newContext.page,
              pageAtaTime: 1,
              category: newContext.category || undefined,
            }, timeoutController.signal);
          }
          // 2. SECOND Priority: Check if movieId exists (Load Seasons)
          else if (newContext.movieId) {
            response = await getSeries({
              movieId: newContext.movieId,
              category: newContext.category || undefined,
            }, timeoutController.signal);
          }
          // 3. LAST Priority: Load main series list
          else {
            response = await getSeries({
              page: newContext.page,
              search: newContext.search,
              pageAtaTime: 1,
              category: newContext.category,
              sort: newContext.sort,
            }, timeoutController.signal);
          }
          if (isStale()) return;
          const responseData = response.data || [];
          setItems((prev) => mergePageResults(prev, newContext.page, responseData, setTotalItemsCount));
          if (responseData.length > 0 && response.total_items) {
            setTotalItemsCount(response.total_items);
          } else if (newContext.page === 1) {
            setTotalItemsCount(0);
          }
        } else {
          const cached = channelsCacheRef.current;
          let allChannels: MediaItem[];
          let groupsForCache: ChannelGroup[];

          if (cached && cached.providerKey === providerKey) {
            allChannels = cached.channels;
            groupsForCache = cached.groups;
          } else {
            const [channelResponse, groupResponse] = await Promise.all([
              getChannels(),
              getChannelGroups(),
            ]);
            if (isStale()) return;
            allChannels = channelResponse.data || [];
            const allGroups = groupResponse.data || [];
            // Stalker/Xtream-style portals commonly include their own
            // "all channels" genre in the groups list (id '*'/'0', titled
            // "All"/"ALL"), on top of the synthetic "All Channels" pseudo-group
            // we always prepend below — without filtering it out here, the
            // sidebar showed two "all" entries, and the API's own one was
            // always empty (real channels never carry that placeholder id as
            // their tv_genre_id, so TvChannelList's filter matched nothing).
            groupsForCache = allGroups.filter(
              (g) => g.id !== '*' && g.id !== '0' && g.title?.trim().toLowerCase() !== 'all'
            );
            channelsCacheRef.current = { providerKey, channels: allChannels, groups: groupsForCache };
          }

          if (isStale()) return;
          const filteredChannels = newContext.search
            ? allChannels.filter((c) =>
                c.name?.toLowerCase().includes(newContext.search!.toLowerCase())
              )
            : allChannels;

          setItems(filteredChannels);
          setTotalItemsCount(filteredChannels.length);
          setChannelGroups([
            { id: 'recent', title: 'Recent Channels' },
            { id: 'fav', title: 'Favorites' },
            { id: 'all', title: 'All Channels' },
            ...groupsForCache,
          ]);
        }
      } catch {
        if (isStale()) return;
        if (newContext.page > 1)
          setPaginationError('Could not load more content.');
        else setError('Could not load content. Please try again later.');
      } finally {
        clearTimeout(timeoutId);
        // A stale request finishing after a newer one must not clear the
        // newer request's own loading state.
        if (!isStale()) {
          setLoading(false);
          isFetchingMore.current = false;
        }
      }
    },
    [contentType, providerKey]
  );

  useEffect(() => {
    fetchProviderKey();
  }, [fetchProviderKey]);

  // 1. Initial Load of main content (runs once providerKey AND real user
  // preferences are both ready) — this is the single place that resolves
  // "what content type/category should we open on" and immediately fetches
  // it, so the displayed contentType/context and the actual loaded items
  // can never disagree. Requires user?.preferences directly (not just
  // "auth isn't loading") — checking the actual data needed, rather than a
  // proxy signal for it, is what closes the race described above. Keyed off
  // user id + providerKey (not the whole `user` object) so it re-fires on a
  // genuine identity/provider change but not on every incidental
  // preference save elsewhere in the app (updatePreferences replaces
  // `user.preferences` wholesale on every write).
  useEffect(() => {
    if (!providerKey || !user?.preferences) return;
    const restoreKey = `${user.id ?? ''}_${providerKey}`;
    if (restoredForRef.current === restoreKey) return;
    restoredForRef.current = restoreKey;

    setFavorites(user.preferences.favorites || []);
    setRecentChannels(user.preferences.recentChannels || []);

    const savedType = user.preferences.preferredContentType || 'movie';
    const key = `${providerKey}_${savedType}`;
    const lastCategory = user.preferences.lastSelectedCategory?.[key] || '*';
    const lastCategoryTitle = user.preferences.lastSelectedCategoryTitle?.[key];
    const newTitle = savedType === 'series' ? 'Series' : savedType === 'tv' ? 'TV' : 'Movies';

    setContentType(savedType);
    const initialCtx = {
      ...initialContext,
      contentType: savedType,
      category: savedType === 'tv' ? null : lastCategory,
      parentTitle: savedType === 'tv' ? 'TV' : (lastCategory === '*' ? newTitle : (lastCategoryTitle || newTitle)),
    };
    fetchData(initialCtx, savedType);
  }, [providerKey, user, fetchData]);

  // 2. Fetch ancillary items (carousel, categories, epg) when contentType or providerKey changes
  useEffect(() => {
    if (!providerKey) return;
    fetchCarousel();
    if (contentType !== 'tv') {
      fetchVodCategories(contentType as 'movie' | 'series');
    } else {
      loadEpgData();
      if (isTizen) {
        const lastPlayedId = user?.preferences?.lastSelectedCategory?.['lastPlayedTvChannelId'];
        setPlayLastTvChannel(lastPlayedId || '__play_first__');
      }
    }
  }, [contentType, providerKey, fetchCarousel, fetchVodCategories, loadEpgData, isTizen, user?.preferences?.lastSelectedCategory?.['lastPlayedTvChannelId']]);

  // Warms the channel-list cache in the background while the user is
  // browsing Movies/Series, so the *first* switch to the TV tab each
  // session — the one visit the client-side cache above can't otherwise
  // speed up, since there's nothing to reuse yet — is already instant too.
  // Delayed so it doesn't compete with the movies/series grid's own
  // carousel/categories/EPG requests firing right after login.
  useEffect(() => {
    if (!providerKey || contentType === 'tv') return;
    if (channelsCacheRef.current?.providerKey === providerKey) return;
    const timer = setTimeout(() => {
      if (channelsCacheRef.current?.providerKey === providerKey) return;
      Promise.all([getChannels(), getChannelGroups()])
        .then(([channelResponse, groupResponse]) => {
          if (channelsCacheRef.current?.providerKey === providerKey) return;
          const allChannels = channelResponse.data || [];
          const allGroups = groupResponse.data || [];
          const groupsForCache = allGroups.filter(
            (g) => g.id !== '*' && g.id !== '0' && g.title?.trim().toLowerCase() !== 'all'
          );
          channelsCacheRef.current = { providerKey, channels: allChannels, groups: groupsForCache };
        })
        .catch(() => {
          // Ignore — the normal TV-tab fetch path will just retry for real.
        });
    }, 3000);
    return () => clearTimeout(timer);
  }, [providerKey, contentType]);

  useLibraryBackgroundRefresh({ context, items, loading, contentType, setItems });

  const handlePageChange = useCallback(
    (direction: number) => {
      const newPage = context.page + direction;
      if (newPage > 1 && (!items || items.length === 0)) {
        return;
      }
      if (
        isFetchingMore.current ||
        loading ||
        (totalItemsCount > 0 && (items?.length || 0) >= totalItemsCount)
      )
        return;

      isFetchingMore.current = true;
      fetchData({ ...context, page: newPage });
    },
    [loading, totalItemsCount, items, context, fetchData]
  );

  const toggleFavorite = useCallback(
    (item: MediaItem) => {
      if (!item?.id) return;
      const wasFavorite = favorites.includes(item.id);
      const newFavs = wasFavorite
        ? favorites.filter((id) => id !== item.id)
        : [...favorites, item.id];

      setFavorites(newFavs);
      updatePreferences({ favorites: newFavs });
      if (wasFavorite) {
        toast.info(`Removed ${item.name || 'Channel'} from favorites`);
      } else {
        toast.success(`Added ${item.name || 'Channel'} to favorites`);
      }
    },
    [favorites, updatePreferences]
  );

  const handleContentTypeChange = useCallback(
    (type: 'movie' | 'series' | 'tv') => {
      if (type === contentType) return;
      
      const key = `${providerKey}_${type}`;
      const lastCategory = type === 'tv' ? null : (user?.preferences?.lastSelectedCategory?.[key] || '*');
      const lastCategoryTitle = type === 'tv' ? 'TV' : (user?.preferences?.lastSelectedCategoryTitle?.[key] || (type === 'movie' ? 'Movies' : 'Series'));

      const newContext = {
        ...initialContext,
        parentTitle: lastCategory === '*' ? (type === 'movie' ? 'Movies' : 'Series') : lastCategoryTitle,
        category: lastCategory,
        contentType: type,
      };

      if (type === 'tv') setChannelGroups([]);
      setContentType(type);
      updatePreferences({ preferredContentType: type });
      setContext(newContext);
      fetchData(newContext, type);

      if (type !== 'tv') {
        fetchVodCategories(type);
      }

      if (type === 'tv') {
        loadEpgData();
        const lastPlayedId = user?.preferences?.lastSelectedCategory?.['lastPlayedTvChannelId'];
        setPlayLastTvChannel(lastPlayedId || '__play_first__');
      } else {
        setPlayLastTvChannel(null);
      }
    },
    [contentType, fetchData, loadEpgData, fetchVodCategories, user, updatePreferences, providerKey]
  );

  const cycleSort = useCallback(() => {
    const sortOptions = ['latest', 'alphabetic', 'oldest'];
    const currentSort = context.sort || 'latest';
    const nextSort =
      sortOptions[(sortOptions.indexOf(currentSort) + 1) % sortOptions.length];
    fetchData({ ...context, sort: nextSort, page: 1 });
  }, [context, fetchData]);

  const handleSearch = useCallback(
    (search: string) => {
      const newTitle = search
        ? `Results for "${search}"`
        : contentType === 'movie'
          ? 'Movies'
          : contentType === 'series'
            ? 'Series'
            : 'TV';
      fetchData({
        ...initialContext,
        search,
        category: search ? '*' : null,
        parentTitle: newTitle,
        contentType,
      });
    },
    [contentType, fetchData]
  );

  const handleClearWatched = useCallback(
    (
      setConfirmModal: Dispatch<
        SetStateAction<{
          isOpen: boolean;
          title: string;
          message: string;
          onConfirm: () => void;
          isDestructive: boolean;
        }>
      >
    ) => {
      setConfirmModal({
        isOpen: true,
        title: 'Clear History',
        message:
          'Are you sure you want to clear all watched and in-progress statuses?',
        isDestructive: true,
        onConfirm: async () => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          try {
            await clearUserProgress();
            setInProgressRecords([]);
            toast.success(
              'All watched and in-progress statuses have been cleared.'
            );
            fetchData(initialContext, contentType);
          } catch (err) {
            console.error('Failed to clear history:', err);
            toast.error('Failed to clear history.');
          }
        },
      });
    },
    [contentType, fetchData]
  );

  const addToRecentChannels = useCallback((item: MediaItem) => {
    if (!item?.id) return;
    setRecentChannels((prev) => {
      const filtered = prev.filter((id) => id !== item.id);
      const updated = [item.id, ...filtered].slice(0, 20);
      updatePreferences({ recentChannels: updated });
      return updated;
    });
  }, [updatePreferences]);

  useInfiniteScroll({
    items,
    loading,
    contentType,
    totalItemsCount,
    handlePageChange,
    isDetailOpen,
    isRestoringFromHistory,
    isFetchingMore,
  });

  useEffect(() => {
    const handleConfigChange = async () => {
      setItems([]);
      setTotalItemsCount(0);
      
      // Re-fetch provider config to get new providerKey
      let freshProviderKey = providerKey;
      try {
        const response = await api.get<{ hostname?: string; providerType?: string }>('/config');
        const host = response.data.hostname || 'default_host';
        const type = response.data.providerType || 'stalker';
        freshProviderKey = `${type}_${host}`;
        setProviderKey(freshProviderKey);
      } catch (err) {
        console.error('Failed to reload active provider config:', err);
      }

      const key = `${freshProviderKey}_${contentType}`;
      const lastCategory = contentType === 'tv' ? null : (user?.preferences?.lastSelectedCategory?.[key] || '*');
      const lastCategoryTitle = contentType === 'tv' ? 'TV' : (user?.preferences?.lastSelectedCategoryTitle?.[key] || (contentType === 'movie' ? 'Movies' : 'Series'));
      const initCtx = {
        ...initialContext,
        category: lastCategory,
        parentTitle: lastCategory === '*' ? (contentType === 'movie' ? 'Movies' : 'Series') : lastCategoryTitle,
        contentType,
      };
      setContext(initCtx);
      fetchData(initCtx, contentType);
      fetchCarousel();
      if (contentType !== 'tv') {
        fetchVodCategories(contentType as 'movie' | 'series');
      } else {
        loadEpgData();
      }
      toast.info('Configuration updated, content reloaded.', {
        autoClose: 3000,
      });
    };

    window.addEventListener('config-changed', handleConfigChange);
    return () =>
      window.removeEventListener('config-changed', handleConfigChange);
  }, [fetchData, contentType, loadEpgData, fetchCarousel, fetchVodCategories, user?.id, providerKey, fetchProviderKey]);

  useEffect(() => {
    const handleCarouselChange = () => {
      fetchCarousel();
    };

    window.addEventListener('carousel-changed', handleCarouselChange);
    return () =>
      window.removeEventListener('carousel-changed', handleCarouselChange);
  }, [fetchCarousel]);

  return {
    context,
    items,
    loading,
    error,
    paginationError,
    totalItemsCount,
    contentType,
    epgData,
    channelGroups,
    favorites,
    recentChannels,
    isPortal,
    cwRefreshKey,
    fetchData,
    handlePageChange,
    toggleFavorite,
    handleContentTypeChange,
    // Raw setter, distinct from handleContentTypeChange — the nav-history
    // frame restore (see useNavigationHistory's NavFrame.contentType) needs
    // to silently put contentType back to whatever it was before a
    // Discover-opened detail page switched it, without handleContentTypeChange's
    // side effects (preference save, category/carousel refetch, toast) firing
    // as if the user had deliberately picked a different tab.
    setContentType,
    cycleSort,
    handleSearch,
    handleClearWatched,
    setCwRefreshKey,
    addToRecentChannels,
    playLastTvChannel,
    setPlayLastTvChannel,
    vodCategories,
    loadingCategories,
    carouselSlides,
    fetchVodCategories,
    fetchCarousel,
    setLoading,
    setItems,
    setContext,
    isRestoringFromHistory,
    setTotalItemsCount,
    progressRecords,
    providerKey,
  };
}
