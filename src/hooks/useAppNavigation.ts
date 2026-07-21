/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/AuthContext';
import { getMedia } from '@/api/endpoints/movies';
import { getMovieUrl } from '@/api/endpoints/movies';
import { getUserProgress } from '@/api/endpoints/user';
import { URL_PATHS } from '@/api/config';
import type { MediaItem, ContextType } from '@/types';
import { isTizenDevice } from '@/utils/helpers';
import { initialContext } from './useMediaLibrary';
import { resolveStreamUrl } from './resolveStreamUrl';
import { useNavigationHistory } from './useNavigationHistory';

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
  detailItem: MediaItem | null,
  onOpenDetail?: (item: MediaItem | null) => void,
  setCwRefreshKey?: React.Dispatch<React.SetStateAction<number>>,
  showDiscover: boolean = false,
  onSetShowDiscover?: (value: boolean) => void,
  variantPickerItem: MediaItem | null = null,
  variantPickerOptions: MediaItem[] = [],
  onSetVariantPicker?: (item: MediaItem | null, options: MediaItem[]) => void
) {
  const { user, updatePreferences } = useAuth();
  const isTizen = isTizenDevice();

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

  const {
    history,
    setHistory,
    isFromContinueWatching,
    pushFrame,
    handleBack,
  } = useNavigationHistory({
    context,
    items,
    focusedIndex,
    currentSeriesItem,
    totalItemsCount,
    detailItem,
    showDiscover,
    variantPickerItem,
    variantPickerOptions,
    streamUrl,
    setFocusedIndex,
    setCurrentSeriesItem,
    setContext,
    setTotalItemsCount,
    setItems,
    isRestoringFromHistory,
    onOpenDetail,
    onSetShowDiscover,
    onSetVariantPicker,
    fetchData,
    setStreamUrl,
    setRawStreamUrl,
    setCurrentItem,
    setResumePlaybackState,
    setCwRefreshKey,
  });

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
        // item.title/.name are the CW card's composite "Series – Episode"
        // display string (see ContinueWatching.tsx) — using them here as the
        // series' own name would feed that composite string back into
        // saveProgress()'s title resolution on this play, and the next time
        // this entry surfaces in Continue Watching it gets composed *again*,
        // doubling the episode-quality suffix. series_name/series_name_alt
        // carry the pre-composition series name instead; only CW items ever
        // set them, so falling back to item.title/.name below still covers
        // any other caller of playContinueWatching.
        const seriesObj = {
          ...item,
          id: mainSeriesId,
          is_series: 1,
          title: (item as any).series_name || item.title,
          name: (item as any).series_name_alt || item.name,
          category_id: item.category_id || (item as any).cw_category_id,
          // Same catalogId stamping as the direct series-click path — a
          // resumed-from-Continue-Watching series needs it too, not just a
          // freshly-clicked one, for "Because You Watched" to resolve.
          catalogId: item.catalogId || `series_${mainSeriesId}`,
        } as MediaItem;

        setCurrentSeriesItem(seriesObj);

        // Only the real previous page goes on the stack — no synthetic
        // Series/Season frame, since the user never actually visited one.
        const homeState = {
          context,
          items,
          focusedIndex,
          currentSeriesItem: null,
          totalItemsCount,
          detailItem,
          showDiscover,
          variantPickerItem,
          variantPickerOptions,
        };
        setHistory((prev) => [...prev, homeState]);
        isFromContinueWatching.current = true;

        // Loaded in the background (not pushed to history) purely so "next
        // episode" autoplay has a real episode list to work from while this
        // session plays — restorePreviousFrame below fully overwrites
        // context/items with homeState's snapshot on Back, so this never
        // lingers as visible state once the user leaves.
        const cwCategory = item.category_id ? String(item.category_id) : ((item as any).cw_category_id ? String((item as any).cw_category_id) : '*');
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
        // Same catalogId stamping as the direct movie-click path and the
        // series branch above — a movie resumed from Continue Watching
        // (isEpisodeCWT false, so seriesObj/catalogId above never runs) was
        // the one remaining play path that left this unset, so its
        // "Because You Watched" title still came back blank.
        catalogId: item.catalogId || (isEpisodeCWT ? undefined : `movie_${item.id}`),
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
    [context, fetchData, focusedIndex, items, totalItemsCount, detailItem, showDiscover, variantPickerItem, variantPickerOptions, setHistory, isFromContinueWatching]
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
          // Prefer the episode's own series/season ids over the ambient
          // navigation context — the series overview page's season tabs
          // fetch episodes directly (bypassing fetchData/context so tab
          // switches don't push history frames), so context.seasonId is
          // never populated there. Falling back to context keeps the old
          // season-page flow (which does set it) working unchanged.
          const res = await getMedia({
            movieId: item.series_id || context.movieId,
            seasonId: item.season_id || context.seasonId,
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
          // item.cmd already present means this item was already resolved to
          // a specific playable file — e.g. Discover's openDiscoverItem
          // already did a getMedia() lookup to build detailItem, and its .id
          // (item.id here) is that FILE's own id, not a catalog movieId. This
          // second getMedia lookup was re-querying the category-LISTING
          // endpoint with that file id, which was never a valid lookup key
          // there (confirmed via real traffic — it came back empty/wrong
          // regardless of which category was tried). resolveStreamUrl always
          // calls movie-link with the item's own id regardless (no item.cmd
          // shortcut, see its own top comment) — for an already-resolved
          // item that's exactly what's needed, so skip straight to it instead
          // of re-deriving the same file via a lookup that doesn't work for
          // file-level ids. Only bare listing-grid clicks (no cmd yet) still
          // need this lookup at all.
          let movieFile = item;
          if (!item.cmd) {
            const res = await getMedia({
              movieId: item.id,
              category: item.category_id ? String(item.category_id) : (context.category || '*'),
            });
            if (!res.data?.length) throw new Error('No movie files returned.');
            movieFile = res.data[0];
          }

          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id, cmd, ...filteredItem } = item;
          // ContentMeta's own id for this title ("movie_{id}") — same
          // convention Discover's own click flow (App.tsx openDiscoverItem)
          // already stamps on, needed so "Because You Watched" can look this
          // title back up later (see VideoContext.tsx's saveProgress). Without
          // this, only Discover-originated plays carried a catalogId, so
          // whenever the most recently watched title was played from the
          // regular Movies grid instead, recommendations' title lookup missed
          // and fell back to a blank "Because You Watched".
          const finalMovieItem = { ...movieFile, ...filteredItem, catalogId: item.catalogId || `movie_${id}` };

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
        // Same catalogId stamping as the movie branch above ("series_{id}",
        // Discover's own convention) — regular series browsing never set
        // this before, so a series watched from here (not Discover) never
        // resolved a title for "Because You Watched".
        setCurrentSeriesItem({ ...item, catalogId: item.catalogId || `series_${item.id}` });
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
        // (which already shows their details) — pressing Play there should go straight
        // to the player, not through a separate detail step.
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
          // Without a pushed frame here, opening the detail modal never
          // touched browser history — Back would skip right past it to
          // whatever the last *real* navigation was, and there was nothing
          // for Forward to ever restore.
          pushFrame();
          onOpenDetail(enrichedItem);
          return;
        }
        await startPlayback(item);
        return;
      }

      pushFrame();
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

  const closePlayer = useCallback(() => {
    if (channelChangeTimer.current) {
      clearTimeout(channelChangeTimer.current);
      channelChangeTimer.current = null;
      setPreviewChannel(null);
      return;
    }
    window.history.back();
  }, []);

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
    setCurrentSeriesItem,
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
