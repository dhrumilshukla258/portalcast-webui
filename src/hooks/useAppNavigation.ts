/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import { getMedia, getMovieUrl, getUserProgress } from '@/services/services';
import { URL_PATHS } from '@/services/api';
import type { MediaItem, ContextType } from '@/types';
import { isTizenDevice } from '@/utils/helpers';
import { initialContext } from './useMediaLibrary';

interface NavFrame {
  context: ContextType;
  items: MediaItem[];
  focusedIndex: number | null;
  currentSeriesItem: MediaItem | null;
  totalItemsCount: number;
}

// The backend always hands back a URL that's already routed through our own
// server behind an opaque token (/live.m3u8?t=..., /api/proxy?t=...) — never
// a raw upstream address, so there's nothing left for the client to wrap.
async function resolveStreamUrl(
  item: MediaItem,
  seriesNumber?: number,
  displayOverride?: { title?: string; category?: string }
): Promise<{ raw: string; proxied: string }> {
  // NOTE: there used to be a shortcut here (`if (!isPortal && item.cmd) return
  // item.cmd directly`) for Xtream-provider setups. That's unsafe now: for
  // episode/movie *files* (unlike already-tokenized live channels via
  // mapChannel), item.cmd from the listing API is the raw, untokenized
  // upstream URL — using it directly bypasses the backend entirely, which is
  // both a security leak (raw portal URL, sometimes with embedded admin
  // credentials, handed to the browser) and why playback failed outright
  // (browsers can't play a random external CDN URL directly — CORS/host
  // issues). Always resolve through the backend, which tokenizes uniformly
  // for both provider types.
  const urlParams: Record<string, any> = { id: item.id };

  if (seriesNumber !== undefined) {
    urlParams.series = seriesNumber;
  }

  // Purely for the admin "active streams" view — lets it show a real title
  // and category instead of an opaque resource key. `item` here is sometimes
  // a resolved *file/quality variant* (e.g. "Hindi / Excellent quality
  // (1080)"), not the actual episode/movie metadata, so callers that know
  // the real title (e.g. combining series + episode name) should pass it via
  // displayOverride rather than relying on item.title/item.name.
  const displayTitle = displayOverride?.title || item.title || item.name;
  if (displayTitle) urlParams.title = displayTitle;
  const displayCategory = displayOverride?.category || item.genres_str || item.tv_genre_id || item.category_id;
  if (displayCategory) urlParams.category = String(displayCategory);

  const linkData = (await getMovieUrl(urlParams)) as Record<string, any>;
  const raw = linkData?.js?.cmd || linkData?.cmd;
  if (typeof raw !== 'string') throw new Error('Stream URL not found.');
  return { raw, proxied: raw };
}

function getResumeTime(): number | undefined {
  return undefined;
}

export function useAppNavigation(
  context: ContextType,
  items: MediaItem[],
  contentType: 'movie' | 'series' | 'tv',
  totalItemsCount: number,
  fetchData: (
    context: ContextType,
    typeOverride?: 'movie' | 'series' | 'tv'
  ) => void,
  isPortal: boolean,
  addToRecentChannels: (item: MediaItem) => void,
  playLastTvChannel: string | null,
  setPlayLastTvChannel: (value: string | null) => void,
  setItems: React.Dispatch<React.SetStateAction<MediaItem[]>>,
  setContext: React.Dispatch<React.SetStateAction<ContextType>>,
  setTotalItemsCount: React.Dispatch<React.SetStateAction<number>>,
  isRestoringFromHistory: React.MutableRefObject<boolean>,
  onOpenDetail?: (item: MediaItem) => void,
  setCwRefreshKey?: React.Dispatch<React.SetStateAction<number>>
) {
  const { user, updatePreferences } = useAuth();
  const isTizen = isTizenDevice();

  const [history, setHistory] = useState<NavFrame[]>([]);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [rawStreamUrl, setRawStreamUrl] = useState<string | null>(null);
  const [currentItem, setCurrentItem] = useState<MediaItem | null>(null);
  const [currentSeriesItem, setCurrentSeriesItem] = useState<MediaItem | null>(
    null
  );
  const [resumePlaybackState, setResumePlaybackState] = useState<
    { currentTime: number } | undefined
  >(undefined);
  const [previewChannel, setPreviewChannel] = useState<MediaItem | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const channelChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushFrame = useCallback(() => {
    setHistory((prev) => [
      ...prev,
      { context, items, focusedIndex, currentSeriesItem, totalItemsCount },
    ]);
  }, [context, items, focusedIndex, currentSeriesItem, totalItemsCount]);

  const openPlayer = useCallback(
    (item: MediaItem, raw: string, proxied: string, resumeTime?: number) => {
      setCurrentItem(item);
      setRawStreamUrl(raw);
      setStreamUrl(proxied);
      setResumePlaybackState(
        resumeTime !== undefined ? { currentTime: resumeTime } : undefined
      );
    },
    []
  );

  const playContinueWatching = useCallback(
    async (item: MediaItem, displayTitle: string) => {
      let savedResumeTime: number | undefined;
      try {
        const records = await getUserProgress();
        const record = records.find(r => r.mediaId === item.id);
        if (record && record.meta) {
          const entry = record.meta;
          if (entry.currentTime && entry.currentTime > 2)
            savedResumeTime = entry.currentTime;
          if (entry.playbackFileId)
            (item as any).playbackFileId = entry.playbackFileId;
        }
      } catch {
        /* ignore */
      }

      const playbackId =
        (item as any).playbackFileId ||
        (item as any).stream_id ||
        (item as any).episode_id ||
        (item as any).video_id ||
        item.id;
      const mainSeriesId =
        (item as any).series_id ||
        (item as any).show_id ||
        (item as any).movie_id ||
        item.id;
      const activeSeasonId =
        (item as any).season_id || (item as any).season || 1;

      const isEpisodeCWT =
        item.is_episode == 1 ||
        item.is_episode === true ||
        (item as any).season_id !== undefined ||
        (item as any).series_id !== undefined;

      if (isEpisodeCWT && mainSeriesId) {
        const seriesObj = {
          ...item,
          id: mainSeriesId,
          is_series: 1,
          category_id: item.category_id || (item as any).cw_category_id,
        } as MediaItem;

        setCurrentSeriesItem(seriesObj);

        const homeState: NavFrame = {
          context,
          items,
          focusedIndex,
          currentSeriesItem: null,
          totalItemsCount,
        };
        const cwCategory = item.category_id ? String(item.category_id) : ((item as any).cw_category_id ? String((item as any).cw_category_id) : '*');
        const seasonContext: ContextType = {
          ...initialContext,
          category: cwCategory,
          movieId: mainSeriesId,
          parentTitle: displayTitle,
          contentType: 'series',
        };
        const seasonState: NavFrame = {
          context: seasonContext,
          items: [],
          focusedIndex: null,
          currentSeriesItem: seriesObj,
          totalItemsCount: 0,
        };

        setHistory((prev) => [...prev, homeState, seasonState]);

        const episodeContext: ContextType = {
          ...initialContext,
          category: cwCategory,
          movieId: mainSeriesId,
          seasonId: activeSeasonId,
          parentTitle: displayTitle,
          contentType: 'series',
        };
        fetchData(episodeContext, 'series');
      }

      setCurrentItem({
        ...item,
        title: item.title || item.name,
        name: item.name || item.title,
      } as MediaItem);

      const urlParams: Record<string, any> = { id: playbackId };
      if (item.series_number !== undefined) {
        urlParams.series = item.series_number;
      } else if (isEpisodeCWT) {
        urlParams.series = 1;
      }
      const streamTitle = item.title || item.name;
      if (streamTitle) urlParams.title = streamTitle;
      const streamCategory = item.genres_str || item.tv_genre_id || item.category_id;
      if (streamCategory) urlParams.category = String(streamCategory);

      const linkData = (await getMovieUrl(urlParams)) as Record<string, any>;
      const freshCmd = linkData?.js?.cmd || linkData?.cmd;
      if (typeof freshCmd !== 'string')
        throw new Error('Fresh stream URL not found.');

      setRawStreamUrl(freshCmd);
      setStreamUrl(freshCmd);
      setResumePlaybackState(
        savedResumeTime ? { currentTime: savedResumeTime } : undefined
      );
    },
    [context, fetchData, focusedIndex, items, totalItemsCount]
  );

  const startPlayback = useCallback(
    async (item: MediaItem, startTime?: number, endTime?: number) => {
      if (contentType === 'tv') {
        if (!item.cmd) {
          toast.error('Channel has no command to play.');
          return;
        }
        const baseUrl = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
        let channelUrl = item.cmd;
        if (channelUrl.startsWith('/')) {
          channelUrl = `${baseUrl}${channelUrl}`;
        }
        if (startTime && endTime) {
          // item.cmd is already a full /live.m3u8?t=<token>&id=...&proxy=1
          // URL from the backend (the token carries the real channel + our
          // identity) — just append the catchup window, don't re-wrap it.
          channelUrl = `${channelUrl}&start_time=${startTime}&end_time=${endTime}`;
        }

        updatePreferences({
          lastSelectedCategory: {
            ...(user?.preferences?.lastSelectedCategory || {}),
            lastPlayedTvChannelId: item.id.toString(),
          },
        });
        addToRecentChannels(item);
        openPlayer(item, channelUrl, channelUrl);
        return;
      }

      if (item.is_episode) {
        try {
          const res = await getMedia({
            movieId: context.movieId,
            seasonId: context.seasonId,
            episodeId: item.id,
            category: '*',
          });
          const episodeFiles = res.data;

          if (!episodeFiles?.length)
            throw new Error('No episode files returned.');

          const episodeFile = episodeFiles[0];
          const enrichedItem = {
            ...episodeFile,
            _episodeCardId: item.id,
            series_number: item.series_number,
          };

          // episodeFile is a resolved file/quality variant (its name is often
          // just "Hindi / Excellent quality (1080)", not the episode title) —
          // build the display title from the real episode entry + series name.
          const seriesName = currentSeriesItem?.title || currentSeriesItem?.name;
          const episodeLabel =
            item.title || item.name || (item.episode_num ? `Episode ${item.episode_num}` : undefined);
          const displayTitle = [seriesName, episodeLabel].filter(Boolean).join(' - ') || undefined;
          const displayCategory = currentSeriesItem?.genres_str
            || currentSeriesItem?.category_id
            || item.genres_str
            || item.category_id;

          const { raw, proxied } = await resolveStreamUrl(
            episodeFile,
            item.series_number,
            { title: displayTitle, category: displayCategory ? String(displayCategory) : undefined }
          );

          openPlayer(enrichedItem as any, raw, proxied, getResumeTime());
        } catch (err) {
          console.error(err);
          toast.error('Could not fetch stream URL.');
        }
        return;
      }

      const isInsideMovieCategory =
        contentType === 'movie' && context.category !== null;

      if (isInsideMovieCategory || item.is_playable_movie) {
        try {
          const res = await getMedia({
            movieId: item.id,
            category: context.category || '*',
          });
          if (!res.data?.length) throw new Error('No movie files returned.');

          const movieFile = res.data[0];
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id, cmd, ...filteredItem } = item;
          const finalMovieItem = { ...movieFile, ...filteredItem };

          // movieFile is a resolved file/quality variant, same issue as the
          // episode case above — use the real movie item's title, not the
          // variant's own name (often just a quality/language descriptor).
          const movieTitle = item.title || item.name;
          const movieCategory = item.genres_str || item.category_id;
          const { raw, proxied } = await resolveStreamUrl(movieFile, undefined, {
            title: movieTitle,
            category: movieCategory ? String(movieCategory) : undefined,
          });
          openPlayer(finalMovieItem, raw, proxied, getResumeTime());
        } catch (err) {
          console.error(err);
          toast.error('Could not fetch stream details.');
        }
        return;
      }
    },
    [
      contentType,
      isPortal,
      addToRecentChannels,
      openPlayer,
      context,
      updatePreferences,
      user?.preferences?.lastSelectedCategory,
      currentSeriesItem,
    ]
  );

  const handleItemClick = useCallback(
    async (item: MediaItem) => {
      if (contentType === 'tv' && streamUrl && currentItem?.id === item.id)
        return;

      if (channelChangeTimer.current) {
        clearTimeout(channelChangeTimer.current);
        channelChangeTimer.current = null;
      }
      setPreviewChannel(null);

      const displayTitle = item.title || item.name || '';

      if (item.is_continue_watching) {
        try {
          await playContinueWatching(item, displayTitle);
        } catch (err) {
          console.error(err);
          toast.error('Link expired or server busy.');
        }
        return;
      }

      const isInsideMovieCategory =
        contentType === 'movie' && context.category !== null;

      if (item.is_series == 1) {
        pushFrame();
        setCurrentSeriesItem(item);
        setResumePlaybackState(undefined);
        fetchData({
          ...initialContext,
          category: '*',
          movieId: item.id,
          parentTitle: displayTitle,
          contentType,
        });
        return;
      }

      if (!isInsideMovieCategory && contentType === 'movie') {
        pushFrame();
        fetchData({
          ...initialContext,
          category: item.id.toString(),
          parentTitle: displayTitle,
          contentType,
        });
        return;
      }

      if (item.is_season) {
        pushFrame();
        fetchData({
          ...initialContext,
          category: context.category,
          movieId: context.movieId,
          seasonId: item.id,
          parentTitle: displayTitle,
          contentType,
        });
        return;
      }

      const isPlayable =
        item.is_episode ||
        isInsideMovieCategory ||
        item.is_playable_movie ||
        contentType === 'tv';
      if (isPlayable) {
        // Episodes are selected from the expandable episode row inside the series page
        // (which already shows their details) — pressing Play there should go straight to
        // the player, not through a separate detail step.
        if (item.is_episode) {
          await startPlayback(item);
          return;
        }
        if (onOpenDetail && contentType !== 'tv') {
          const enrichedItem = {
            ...item,
            description: item.description || currentSeriesItem?.description,
            director: item.director || currentSeriesItem?.director,
            actors: item.actors || currentSeriesItem?.actors,
            year: item.year || currentSeriesItem?.year,
            rating_imdb: item.rating_imdb || currentSeriesItem?.rating_imdb,
            rating_kinopoisk:
              item.rating_kinopoisk || currentSeriesItem?.rating_kinopoisk,
            rating_mpaa: item.rating_mpaa || currentSeriesItem?.rating_mpaa,
            age: item.age || currentSeriesItem?.age,
            country: item.country || currentSeriesItem?.country,
            genres_str: item.genres_str || currentSeriesItem?.genres_str,
            screenshot_uri:
              item.screenshot_uri || currentSeriesItem?.screenshot_uri,
          };
          onOpenDetail(enrichedItem);
          return;
        }
        await startPlayback(item);
        return;
      }

      fetchData({
        ...initialContext,
        category: item.id,
        parentTitle: displayTitle,
        contentType,
      });
    },
    [
      contentType,
      context,
      currentItem,
      currentSeriesItem,
      fetchData,
      playContinueWatching,
      pushFrame,
      streamUrl,
      onOpenDetail,
      startPlayback,
    ]
  );

  const restorePreviousFrame = useCallback(() => {
    if (streamUrl) {
      setStreamUrl(null);
      setRawStreamUrl(null);
      setCurrentItem(null);
      setResumePlaybackState(undefined);
      // Closing the player is the natural point to refresh Continue Watching —
      // playback just wrote fresh progress via saveProgress()'s periodic/unload
      // saves, but nothing else ever triggers ContinueWatching.tsx to refetch
      // (its own loadItems() only runs once on mount, keyed off this exact
      // refreshKey — which, before this fix, was never incremented anywhere
      // in the app). Without this, the CW row can show stale state (including
      // a blank title/poster from before this exact viewing session) until
      // an unrelated full page reload happens to remount it.
      setCwRefreshKey?.((prev) => prev + 1);
      return;
    }

    if (history.length > 0) {
      const previousFrame = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));

      setFocusedIndex(previousFrame.focusedIndex);
      setCurrentSeriesItem(previousFrame.currentSeriesItem);
      setContext(previousFrame.context);
      setTotalItemsCount(previousFrame.totalItemsCount);

      if (previousFrame.items.length > 0) {
        // Real cached data (this frame was actually loaded before) — restore
        // instantly, no refetch needed. Block fetchData briefly so the
        // context-change effect below doesn't immediately stomp on it.
        isRestoringFromHistory.current = true;
        setItems(previousFrame.items);
        setTimeout(() => {
          isRestoringFromHistory.current = false;
        }, 500);
      } else {
        // Placeholder frame pushed without ever being populated (e.g. Continue
        // Watching jumps straight to playback and pushes an empty season/series
        // frame for "back" to land on) — fetch it for real instead of leaving
        // the page stuck on an empty list until some unrelated click refetches it.
        setItems([]);
        fetchData(previousFrame.context);
      }
    }
  }, [
    streamUrl,
    fetchData,
    history,
    isRestoringFromHistory,
    setItems,
    setContext,
    setTotalItemsCount,
    setCwRefreshKey,
  ]);

  const closePlayer = useCallback(() => {
    if (channelChangeTimer.current) {
      clearTimeout(channelChangeTimer.current);
      channelChangeTimer.current = null;
      setPreviewChannel(null);
      return;
    }
    window.history.back();
  }, []);

  const handleBack = useCallback(() => {
    if (streamUrl || history.length > 0) {
      window.history.back();
    }
  }, [streamUrl, history.length]);

  const playCastedMedia = useCallback(
    (
      media: MediaItem,
      castStreamUrl?: string,
      castRawStreamUrl?: string,
      castContentType?: 'movie' | 'series' | 'tv'
    ) => {
      setCurrentItem(media);
      if (castRawStreamUrl) setRawStreamUrl(castRawStreamUrl);
      if (castContentType) {
        setContext((prev) => ({ ...prev, contentType: castContentType }));
      }
      setStreamUrl(castStreamUrl ?? castRawStreamUrl ?? null);
    },
    [setContext]
  );

  const debounceChannelChange = useCallback(
    (direction: 'next' | 'prev') => {
      if (channelChangeTimer.current) clearTimeout(channelChangeTimer.current);

      const activeChannel = previewChannel || currentItem;
      if (!activeChannel) return;

      const currentIndex = items.findIndex((i) => i.id === activeChannel.id);
      if (currentIndex === -1) return;

      const newIndex =
        direction === 'next'
          ? Math.min(currentIndex + 1, items.length - 1)
          : Math.max(currentIndex - 1, 0);

      if (newIndex === currentIndex) return;

      const nextChannel = items[newIndex];
      setPreviewChannel(nextChannel);

      channelChangeTimer.current = setTimeout(() => {
        handleItemClick(nextChannel);
        setPreviewChannel(null);
        channelChangeTimer.current = null;
      }, 2000);
    },
    [currentItem, handleItemClick, items, previewChannel]
  );

  const handleNextChannel = useCallback(
    () => debounceChannelChange('next'),
    [debounceChannelChange]
  );
  const handlePrevChannel = useCallback(
    () => debounceChannelChange('prev'),
    [debounceChannelChange]
  );

  useEffect(() => {
    if (isRestoringFromHistory.current) {
      return;
    }
    setFocusedIndex(null);
  }, [context.category, context.movieId, context.seasonId, context.search, contentType, isRestoringFromHistory]);

  const restorePreviousFrameRef = useRef(restorePreviousFrame);
  useEffect(() => {
    restorePreviousFrameRef.current = restorePreviousFrame;
  }, [restorePreviousFrame]);

  const navDepth = history.length + (streamUrl ? 1 : 0);
  const prevNavDepth = useRef(navDepth);

  useEffect(() => {
    if (navDepth > prevNavDepth.current) {
      window.history.pushState({ depth: navDepth }, '');
    }
    prevNavDepth.current = navDepth;
  }, [navDepth]);

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const state = e.state;
      if (state && (state.modal || state.view)) {
        return;
      }
      const stateDepth = state && typeof state.depth === 'number' ? state.depth : 0;
      if (stateDepth === prevNavDepth.current) {
        return;
      }
      restorePreviousFrameRef.current?.();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (
      !playLastTvChannel ||
      items.length === 0 ||
      contentType !== 'tv' ||
      !isTizen
    )
      return;
    const channel =
      playLastTvChannel === '__play_first__'
        ? items[0]
        : (items.find((i) => i.id === playLastTvChannel) ?? items[0]);
    if (channel) handleItemClick(channel);
    setPlayLastTvChannel(null);
  }, [
    items,
    playLastTvChannel,
    contentType,
    handleItemClick,
    isTizen,
    setPlayLastTvChannel,
  ]);

  return {
    history,
    streamUrl,
    rawStreamUrl,
    currentItem,
    currentSeriesItem,
    resumePlaybackState,
    previewChannel,
    focusedIndex,
    setFocusedIndex,
    handleItemClick,
    handleBack,
    closePlayer,
    handleNextChannel,
    handlePrevChannel,
    playCastedMedia,
    pushFrame,
    startPlayback,
  };
}
