/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { toast } from 'react-toastify';
import { saveUserProgress, getUserProgress } from '@/api/endpoints/user';
import { useEpisodeLookup, resolveAdjacentEpisode } from '@/context/video/useEpisodeLookup';

interface UseProgressTrackingArgs {
  playerRef: RefObject<any>;
  contentType: 'movie' | 'series' | 'tv';
  mediaId?: string | null;
  itemId?: string | null;
  seasonId?: string | null;
  categoryId?: string | null;
  item?: any;
  seriesItem?: any;
  rawStreamUrl?: string | null;
  episodes?: any[];
  onEpisodeSelect?: (item: any) => void;
  onLoadMoreEpisodes?: () => Promise<void>;
  initialPlaybackState?: any;
  streamUrl?: string | null;
  resetRecoveryState: () => void;
}

// Owns everything keyed off hasRestoredProgress/hasCompletedPlayback — these
// two refs are read/written across saveProgress, handleTimeUpdate,
// completePlayback and the reset effect below, so they stay together with
// the callbacks that touch them rather than being split further.
export function useProgressTracking({
  playerRef,
  contentType,
  mediaId,
  itemId,
  seasonId,
  categoryId,
  item,
  seriesItem,
  rawStreamUrl,
  episodes,
  onEpisodeSelect,
  onLoadMoreEpisodes,
  initialPlaybackState,
  streamUrl,
  resetRecoveryState,
}: UseProgressTrackingArgs) {
  const hasRestoredProgress = useRef(false);
  const hasCompletedPlayback = useRef(false);
  const [showNextEpisodeButton, setShowNextEpisodeButton] = useState(false);
  const [pendingNextIndex, setPendingNextIndex] = useState<number | null>(null);

  const episodeLookup = useEpisodeLookup(episodes, item);

  useEffect(() => {
    resetRecoveryState();
    hasCompletedPlayback.current = false;
  }, [streamUrl, rawStreamUrl, resetRecoveryState]);

  const completePlayback = useCallback(async () => {
    if (!mediaId || contentType === 'tv' || hasCompletedPlayback.current) return;
    hasCompletedPlayback.current = true;
    const player = playerRef.current;
    const dur = player?.duration || 0;

    let nextEp: any = null;
    if (contentType === 'series' && episodes && episodes.length > 0 && item) {
      nextEp = resolveAdjacentEpisode(episodeLookup, episodes, 1).episode;
    }

    const completedMeta = {
      mediaId,
      itemId,
      type: contentType,
      timestamp: Date.now(),
    };

    await saveUserProgress(mediaId, dur, true, completedMeta).catch(() => {});

    if (contentType === 'series' && itemId && itemId !== mediaId) {
      if (nextEp) {
        // Same blank-title guard as saveProgress() below — a blank title here
        // renders as a bare "??" in Continue Watching.
        const nextResolvedTitle = seriesItem?.name || seriesItem?.title || '';
        if (!nextResolvedTitle) return;

        const nextProgressData = {
          id: itemId,
          playbackFileId: nextEp.id,
          mediaId: nextEp.id,
          itemId,
          seasonId,
          categoryId,
          type: contentType,
          title: nextResolvedTitle,
          currentTime: 0,
          duration: 0,
          progressPercent: 0,
          timestamp: Date.now(),
          name: nextResolvedTitle,
          episodeTitle: nextEp.name || nextEp.title || '',
          screenshot_uri: seriesItem?.screenshot_uri || nextEp.screenshot_uri || '',
          is_series: 1,
          cmd: nextEp.cmd || '',
          series_number: nextEp.series_number,
        };
        await saveUserProgress(itemId, 0, false, nextProgressData).catch(() => {});
        await saveUserProgress(nextEp.id, 0, false, nextProgressData).catch(() => {});
      } else {
        await saveUserProgress(itemId, dur, true, completedMeta).catch(() => {});
      }
    }
  }, [contentType, mediaId, itemId, episodes, item, seasonId, categoryId, seriesItem, episodeLookup, playerRef]);

  const handleTimeUpdate = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    const time = player.currentTime;
    const dur = player.duration;

    if (!hasRestoredProgress.current && time >= 1) {
      hasRestoredProgress.current = true;
      let targetTime = initialPlaybackState?.currentTime || 0;
      getUserProgress().then((records) => {
        const record = records.find((r) => r.mediaId === (itemId || mediaId));
        if (record && !record.completed && record.progress > targetTime) {
          targetTime = record.progress;
        }
        if (targetTime > 2) {
          player.currentTime = targetTime;
        }
      }).catch((err) => {
        console.error('Failed to restore progress from API:', err);
        if (targetTime > 2) player.currentTime = targetTime;
      });
    }

    if (dur > 0 && contentType === 'series' && (dur - time <= 300)) {
      setShowNextEpisodeButton((prev) => (prev ? prev : true));
    } else {
      setShowNextEpisodeButton((prev) => (prev ? false : prev));
    }

    if (dur > 0 && contentType !== 'tv' && time / dur >= 0.9 && mediaId) {
      completePlayback();
    }
  }, [contentType, mediaId, itemId, initialPlaybackState, completePlayback, playerRef]);

  const saveProgress = useCallback(() => {
    if (contentType === 'tv') return;
    const player = playerRef.current;
    if (
      !player ||
      !mediaId ||
      !player.duration ||
      player.duration <= 0 ||
      player.currentTime <= 2
    )
      return;

    if (player.currentTime / player.duration >= 0.9) return;

    const resolvedTitle =
      seriesItem?.name || seriesItem?.title || item?.name || item?.title || '';
    // Item/series metadata can still be mid-fetch on the very first tick after
    // playback starts (autoplay can beat the metadata request) — skip saving
    // rather than persist a blank title, which renders as a bare "??" in the
    // Continue Watching row (see MediaCard's initials fallback). A later tick
    // with the real title will upsert over any earlier save for this mediaId.
    if (!resolvedTitle) return;

    const targetKeyId = itemId && itemId !== mediaId ? itemId : mediaId;
    // ContentMeta's own id ("movie_{id}"/"series_{id}") for this title, when
    // known — preserved through openDiscoverItem (App.tsx) specifically so
    // recommendations can look this exact title back up in ContentMeta later.
    // mediaId/itemId are playback-file ids (the portal's own resolved file
    // id), which for Discover-opened titles are NOT valid ContentMeta lookup
    // keys — that mismatch was silently breaking "Because You Watched X"
    // (basedOnTitle came back null since the lookup found nothing).
    const catalogId = seriesItem?.catalogId || item?.catalogId || undefined;
    const progressData = {
      id: targetKeyId,
      playbackFileId: itemId || mediaId,
      mediaId,
      itemId,
      seasonId,
      categoryId,
      type: contentType,
      title: resolvedTitle,
      currentTime: player.currentTime,
      duration: player.duration,
      progressPercent: Math.round((player.currentTime / player.duration) * 100),
      timestamp: Date.now(),
      name: resolvedTitle,
      episodeTitle: item?.name || item?.title || '',
      screenshot_uri: seriesItem?.screenshot_uri || item?.screenshot_uri || '',
      is_series: seriesItem ? 1 : 0,
      cmd: item?.cmd || rawStreamUrl || '',
      series_number: item?.series_number,
      catalogId,
    };

    saveUserProgress(targetKeyId, player.currentTime, false, progressData).catch((err) => {
      console.error('Failed to save progress to DB:', err);
    });
    if (mediaId) {
      saveUserProgress(mediaId, player.currentTime, false, progressData).catch(() => {});
    }
  }, [
    contentType,
    mediaId,
    itemId,
    seasonId,
    categoryId,
    seriesItem,
    item?.name,
    item?.title,
    item?.screenshot_uri,
    item?.cmd,
    item?.series_number,
    rawStreamUrl,
    playerRef,
  ]);

  const handleEnded = useCallback(() => {
    completePlayback();

    if (episodes && episodes.length > 0 && item && onEpisodeSelect) {
      const { episode: nextEp, stepIndex } = resolveAdjacentEpisode(episodeLookup, episodes, 1);
      if (nextEp) {
        toast.info(`Playing Next Episode: ${nextEp.name || nextEp.title}`);
        onEpisodeSelect(nextEp);
      } else if (stepIndex === episodes.length && onLoadMoreEpisodes) {
        toast.info('Loading next episodes...');
        setPendingNextIndex(stepIndex);
        onLoadMoreEpisodes().catch((err) => {
          console.error('Failed to load more episodes:', err);
          setPendingNextIndex(null);
        });
      }
    }
  }, [episodes, item, onEpisodeSelect, onLoadMoreEpisodes, completePlayback, episodeLookup]);

  const playNextEpisode = useCallback(async () => {
    if (episodes && episodes.length > 0 && item && onEpisodeSelect) {
      const { episode: nextEp, stepIndex } = resolveAdjacentEpisode(episodeLookup, episodes, 1);
      if (nextEp) {
        await completePlayback();
        toast.info(`Playing Next Episode: ${nextEp.name || nextEp.title}`);
        onEpisodeSelect(nextEp);
      } else if (stepIndex === episodes.length && onLoadMoreEpisodes) {
        toast.info('Loading next episodes...');
        setPendingNextIndex(stepIndex);
        onLoadMoreEpisodes().catch((err) => {
          console.error('Failed to load more episodes:', err);
          setPendingNextIndex(null);
        });
      }
    }
  }, [episodes, item, onEpisodeSelect, onLoadMoreEpisodes, completePlayback, episodeLookup]);

  const playPrevEpisode = useCallback(() => {
    if (episodes && episodes.length > 0 && item && onEpisodeSelect) {
      const { episode: prevEp } = resolveAdjacentEpisode(episodeLookup, episodes, -1);
      if (prevEp) {
        saveProgress();
        toast.info(`Playing Previous Episode: ${prevEp.name || prevEp.title}`);
        onEpisodeSelect(prevEp);
      }
    }
  }, [episodes, item, onEpisodeSelect, saveProgress, episodeLookup]);

  const saveProgressRef = useRef(saveProgress);
  useEffect(() => {
    saveProgressRef.current = saveProgress;
  }, [saveProgress]);

  useEffect(() => {
    if (contentType === 'tv') return;
    const interval = setInterval(() => {
      saveProgressRef.current();
    }, 30000);
    const handleUnload = () => {
      saveProgressRef.current();
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      saveProgressRef.current();
    };
  }, [contentType]);

  // Autoplay next page of episodes once they finish loading (triggered by the
  // onLoadMoreEpisodes calls above).
  useEffect(() => {
    if (pendingNextIndex !== null && episodes && pendingNextIndex < episodes.length) {
      const nextEp = episodes[pendingNextIndex];
      setPendingNextIndex(null);
      if (nextEp && onEpisodeSelect) {
        toast.info(`Playing Next Episode: ${nextEp.name || nextEp.title}`);
        onEpisodeSelect(nextEp);
      }
    }
  }, [episodes, pendingNextIndex, onEpisodeSelect]);

  return {
    showNextEpisodeButton,
    setShowNextEpisodeButton,
    saveProgress,
    handleTimeUpdate,
    completePlayback,
    handleEnded,
    playNextEpisode,
    playPrevEpisode,
    hasRestoredProgress,
  };
}
