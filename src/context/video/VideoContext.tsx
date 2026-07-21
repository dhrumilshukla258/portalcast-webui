/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { isTizenDevice } from '@/utils/helpers';
import type { VideoFitMode } from '@/types';
import {
  VideoContext,
  type VideoContextType,
} from '@/context/video/VideoContextTypes';
import { useAuth } from '@/context/AuthContext';
import { useEpgSync } from '@/context/video/useEpgSync';
import { useHlsRecovery } from '@/context/video/useHlsRecovery';
import { useVideoSeek } from '@/context/video/useVideoSeek';
import { useSubtitles } from '@/context/video/useSubtitles';
import { useCasting } from '@/context/video/useCasting';
import { useProgressTracking } from '@/context/video/useProgressTracking';
import { useDownloadActions } from '@/context/video/useDownloadActions';

// Stable fallback references for optional props below — `receivers || []`
// (etc.) would otherwise create a brand-new array/function on every render
// whenever the prop is undefined, defeating the value-object useMemo below
// even when nothing meaningful changed.
const EMPTY_RECEIVERS: any[] = [];
const noopRefreshReceivers = () => {};

interface VideoProviderProps {
  children: ReactNode;
  streamUrl?: string | null;
  rawStreamUrl?: string | null;
  itemId?: string | null;
  seasonId?: string | null;
  categoryId?: string | null;
  contentType: 'movie' | 'series' | 'tv';
  mediaId?: string | null;
  item?: any;
  seriesItem?: any;
  channelInfo?: any;
  previewChannelInfo?: any;
  epgData?: any;
  channels?: any[];
  episodes?: any[];
  channelGroups?: any[];
  onNextChannel?: () => void;
  onPrevChannel?: () => void;
  onChannelSelect?: (item: any) => void;
  onEpisodeSelect?: (item: any) => void;
  onLoadMoreEpisodes?: () => Promise<void>;
  favorites: string[];
  recentChannels?: string[];
  toggleFavorite: (channel: any) => void;
  initialPlaybackState?: any;
  onEnded?: () => void;
  onBack: () => void;
  receivers?: any[];
  isReceiver?: boolean;
  castTo?: (deviceId: string, media: any, state: any) => void;
  refreshReceivers?: () => void;
}

export const VideoProvider: React.FC<VideoProviderProps> = ({
  children,
  streamUrl,
  rawStreamUrl,
  contentType,
  mediaId,
  item,
  seriesItem,
  itemId,
  seasonId,
  categoryId,
  channelInfo,
  previewChannelInfo,
  epgData,
  channels,
  episodes,
  channelGroups,
  onNextChannel,
  onPrevChannel,
  onChannelSelect,
  onEpisodeSelect,
  onLoadMoreEpisodes,
  favorites,
  recentChannels,
  toggleFavorite,
  initialPlaybackState,
  onBack,
  receivers,
  isReceiver,
  castTo,
    refreshReceivers,
}) => {
  const { user, updatePreferences } = useAuth();
  const isTizen = isTizenDevice();

  // --- Refs ---
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- App & UI States ---
  const [controlsVisible, setControlsVisible] = useState(true);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [useProxy, setUseProxy] = useState(!isTizenDevice());
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [showChannelList, setShowChannelList] = useState(false);
  const [showEpisodeList, setShowEpisodeList] = useState(false);

  const [fitMode, setFitMode] = useState<VideoFitMode>(
    (user?.preferences?.videoFitMode as VideoFitMode) || 'contain'
  );

  useEffect(() => {
    if (user?.preferences?.videoFitMode) {
      setFitMode(user.preferences.videoFitMode as VideoFitMode);
    }
  }, [user]);

  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [activeSettingsMenu, setActiveSettingsMenu] = useState<
    'main' | 'quality' | 'audio' | 'subtitles' | 'add-subtitle' | 'cast'
  >('main');

  // --- Live TV States ---
  const [liveTime, setLiveTime] = useState('');
  const { currentProgram, nextProgram, programProgress } = useEpgSync(
    contentType,
    channelInfo,
    epgData
  );

  const isFavorite = channelInfo ? favorites.includes(channelInfo.id) : false;
  // Always true now since we use Vidstack's native menus which auto-populate
  const showSettingsButton = true;

  // --- Live Time Update ---
  useEffect(() => {
    if (contentType !== 'tv') return;
    const updateLiveTime = () => {
      const now = new Date();
      setLiveTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
    };
    updateLiveTime();
    const interval = setInterval(updateLiveTime, 1000);
    return () => clearInterval(interval);
  }, [contentType]);

  useEffect(() => {
    if (fitMode && user) {
      if (user.preferences?.videoFitMode !== fitMode) {
        updatePreferences({ videoFitMode: fitMode });
      }
    }
  }, [fitMode, user, updatePreferences]);

  const {
    retryCount,
    reloadTrigger,
    isRecovering,
    streamError,
    setStreamError,
    setRetryCount,
    setReloadTrigger,
    resetRecoveryState,
    onProviderChange,
    handleError,
  } = useHlsRecovery(contentType, streamUrl, playerRef);

  const {
    subtitles,
    onlineSubtitleResults,
    subtitleSearchLoading,
    searchOnlineSubtitles,
    addOnlineSubtitle,
    addLocalSubtitleFile,
    clearSubtitleSearch,
  } = useSubtitles(streamUrl, rawStreamUrl, contentType, item, seriesItem);

  const {
    showNextEpisodeButton,
    setShowNextEpisodeButton,
    saveProgress,
    handleTimeUpdate,
    handleEnded,
    playNextEpisode,
    playPrevEpisode,
    hasRestoredProgress,
  } = useProgressTracking({
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
  });

  const { copied, handleCopyLink, handleDownload } = useDownloadActions({
    item,
    itemId,
    rawStreamUrl,
    contentType,
    seriesItem,
  });

  // --- Controls & Cursor Visibility ---
  const showControlsAndCursor = useCallback(() => {
    setControlsVisible(true);
    setCursorVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (cursorTimeoutRef.current) clearTimeout(cursorTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(
      () => setControlsVisible(false),
      5000
    );
    cursorTimeoutRef.current = setTimeout(() => setCursorVisible(false), 5000);
  }, []);

  useEffect(() => {
    showControlsAndCursor();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (cursorTimeoutRef.current) clearTimeout(cursorTimeoutRef.current);
    };
  }, [showControlsAndCursor]);

  const { seekOverlay, handleSkipButtonClick } = useVideoSeek(
    playerRef,
    showControlsAndCursor,
    setControlsVisible
  );

  // --- Actions ---
  const cycleFitMode = useCallback(() => {
    const FIT_MODES: VideoFitMode[] = ['contain', 'cover', 'fill'];
    setFitMode(
      (curr) => FIT_MODES[(FIT_MODES.indexOf(curr) + 1) % FIT_MODES.length]
    );
  }, []);

  const toggleSettingsMenu = useCallback(() => {
    setIsSettingsMenuOpen((prev) => !prev);
    if (!isSettingsMenuOpen) setActiveSettingsMenu('main');
  }, [isSettingsMenuOpen]);

  const { handleCast } = useCasting(
    playerRef,
    item,
    previewChannelInfo,
    channelInfo,
    streamUrl,
    rawStreamUrl,
    contentType,
    castTo,
    setIsSettingsMenuOpen
  );

  const toggleChannelList = useCallback(() => {
    showControlsAndCursor();
    if (controlsVisible) setShowChannelList(true);
  }, [controlsVisible, showControlsAndCursor]);

  const handleCanPlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    resetRecoveryState();

    if (initialPlaybackState) {
      if (initialPlaybackState.volume !== undefined)
        player.volume = initialPlaybackState.volume;
      if (initialPlaybackState.muted !== undefined)
        player.muted = initialPlaybackState.muted;
    }
  }, [initialPlaybackState, resetRecoveryState]);

  const handleProxyToggle = useCallback(
    (newProxyState: boolean) => {
      saveProgress();
      setUseProxy(newProxyState);
      hasRestoredProgress.current = false;
      setReloadTrigger((prev) => prev + 1);
    },
    [saveProgress, setReloadTrigger, hasRestoredProgress]
  );

  useEffect(() => {
    setStreamError(null);
    setRetryCount(0);
  }, [itemId, streamUrl, setStreamError, setRetryCount]);

  useEffect(() => {
    if (previewChannelInfo) showControlsAndCursor();
  }, [previewChannelInfo, showControlsAndCursor]);

  // Note: Only the essential non-video states are passed here.
  // Make sure your `VideoContextTypes.ts` matches the cleaned up version provided in the previous step!
  //
  // Memoized — this provider's own state changes legitimately produce a new
  // value (that's correct: consumers that read that field need to
  // re-render). What this guards against is a *parent* re-render (e.g. the
  // search box in App.tsx re-rendering TVPortal while a video plays) forcing
  // every context consumer to re-render even though nothing here actually
  // changed. All state setters (setControlsVisible etc.) are omitted from
  // the deps array since React guarantees their identity is stable across
  // renders; refs (playerRef etc.) are omitted for the same reason.
  const value: VideoContextType = useMemo(
    () => ({
      playerRef,
      playerContainerRef,
      settingsMenuRef,

      controlsVisible,
      cursorVisible,
      copied,
      useProxy,
      isTooltipVisible,
      focusedIndex,
      showChannelList,
      showEpisodeList,
      seekOverlay,
      fitMode,
      isSettingsMenuOpen,
      activeSettingsMenu,
      showSettingsButton,
      showNextEpisodeButton,

      currentProgram,
      nextProgram,
      programProgress,
      liveTime,
      isFavorite,
      retryCount,
      reloadTrigger,
      isRecovering,
      isTizen,
      streamError,

      streamUrl,
      rawStreamUrl,
      itemId,
      subtitles,
      onlineSubtitleResults,
      subtitleSearchLoading,
      contentType,
      mediaId,
      item,
      seriesItem,
      channelInfo,
      previewChannelInfo,
      epgData,
      channels,
      episodes,
      initialPlaybackState,
      channelGroups,
      favorites,
      recentChannels,
      receivers: receivers || EMPTY_RECEIVERS,
      isReceiver: isReceiver || false,
      refreshReceivers: refreshReceivers || noopRefreshReceivers,

      onBack,
      toggleFavorite,
      onNextChannel,
      onPrevChannel,
      onChannelSelect,
      onEpisodeSelect,
      onLoadMoreEpisodes,
      playNextEpisode,
      playPrevEpisode,

      handleSkipButtonClick,
      setControlsVisible,
      setCursorVisible,
      setIsTooltipVisible,
      setFocusedIndex,
      setShowChannelList,
      setShowEpisodeList,
      setShowNextEpisodeButton,
      showControlsAndCursor,
      cycleFitMode,
      toggleSettingsMenu,
      setActiveSettingsMenu,
      setIsSettingsMenuOpen,
      handleCopyLink,
      handleDownload,
      searchOnlineSubtitles,
      addOnlineSubtitle,
      addLocalSubtitleFile,
      clearSubtitleSearch,
      setUseProxy: handleProxyToggle,
      handleCast,
      onProviderChange,
      handleCanPlay,
      handleTimeUpdate,
      handleError,
      handleEnded,
      toggleChannelList,
      handleVideoClick: showControlsAndCursor,
      handleMouseMove: showControlsAndCursor,
    }),
    [
      controlsVisible,
      cursorVisible,
      copied,
      useProxy,
      isTooltipVisible,
      focusedIndex,
      showChannelList,
      showEpisodeList,
      seekOverlay,
      fitMode,
      isSettingsMenuOpen,
      activeSettingsMenu,
      showSettingsButton,
      showNextEpisodeButton,
      currentProgram,
      nextProgram,
      programProgress,
      liveTime,
      isFavorite,
      retryCount,
      reloadTrigger,
      isRecovering,
      isTizen,
      streamError,
      streamUrl,
      rawStreamUrl,
      itemId,
      subtitles,
      onlineSubtitleResults,
      subtitleSearchLoading,
      contentType,
      mediaId,
      item,
      seriesItem,
      channelInfo,
      previewChannelInfo,
      epgData,
      channels,
      episodes,
      initialPlaybackState,
      channelGroups,
      favorites,
      recentChannels,
      receivers,
      isReceiver,
      refreshReceivers,
      onBack,
      toggleFavorite,
      onNextChannel,
      onPrevChannel,
      onChannelSelect,
      onEpisodeSelect,
      onLoadMoreEpisodes,
      playNextEpisode,
      playPrevEpisode,
      handleSkipButtonClick,
      showControlsAndCursor,
      cycleFitMode,
      toggleSettingsMenu,
      handleCopyLink,
      handleDownload,
      searchOnlineSubtitles,
      addOnlineSubtitle,
      addLocalSubtitleFile,
      clearSubtitleSearch,
      handleProxyToggle,
      handleCast,
      onProviderChange,
      handleCanPlay,
      handleTimeUpdate,
      handleError,
      handleEnded,
      toggleChannelList,
    ]
  );

  return (
    <VideoContext.Provider value={value}>{children}</VideoContext.Provider>
  );
};
