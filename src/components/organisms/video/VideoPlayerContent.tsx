/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef } from 'react';
import {
  MediaPlayer,
  MediaProvider,
  Captions,
  useMediaRemote,
  type PlayerSrc,
} from '@vidstack/react';
import '@vidstack/react/player/styles/base.css';

import TvChannelList, {
  type TvChannelListRef,
} from '@/components/organisms/channels/TvChannelList';
import EpisodeOverlay, {
  type EpisodeOverlayRef,
} from '@/components/organisms/video/EpisodeOverlay';
import '@/components/organisms/video/VideoPlayerContent.css';

import { BufferingOverlay } from '@/components/molecules/BufferingOverlay';
import { SeekOverlay } from '@/components/molecules/SeekOverlay';
import { TopBar } from '@/components/organisms/layout/TopBar';
import { TVControls } from '@/components/organisms/video/TVControls';
import { VODControls } from '@/components/organisms/video/VODControls';
import { useVideoContext } from '@/context/video';
import { useTVRemoteNavigation } from '@/components/organisms/video/hooks/useTVRemoteNavigation';
import { useTouchGestures } from '@/components/organisms/video/hooks/useTouchGestures';

const VideoPlayerContent: React.FC = () => {
  const {
    playerRef,
    playerContainerRef,

    controlsVisible,
    cursorVisible,
    useProxy,
    showChannelList,
    showEpisodeList,
    showNextEpisodeButton,
    setShowNextEpisodeButton,
    seekOverlay,
    fitMode,

    streamUrl,
    rawStreamUrl,
    contentType,
    itemId,
    item,
    seriesItem,
    channels,
    episodes,
    previewChannelInfo,
    channelInfo,
    channelGroups,
    retryCount,
    reloadTrigger,
    isRecovering,
    isTizen,
    streamError,

    onProviderChange,
    handleCanPlay,
    handleVolumeChange,
    handleTimeUpdate,
    handleError,
    handleEnded,
    handleMouseMove,
    setIsTooltipVisible,
    setControlsVisible,
    setCursorVisible,
    setShowChannelList,
    setShowEpisodeList,
    onChannelSelect,
    onEpisodeSelect,
    playNextEpisode,
    onBack,
    subtitles,
    favorites,
    recentChannels,
  } = useVideoContext();

  const remote = useMediaRemote(playerRef);
  const tvChannelListRef = useRef<TvChannelListRef>(null);
  const episodeOverlayRef = useRef<EpisodeOverlayRef>(null);
  const speedBannerRef = useRef<HTMLDivElement>(null);

  const { showExitToast } = useTVRemoteNavigation(
    tvChannelListRef,
    episodeOverlayRef,
    remote
  );
  const { handleTouchStart, handleTouchEnd, lastTouchTime } = useTouchGestures(
    playerContainerRef,
    speedBannerRef,
    remote
  );

  // TV Browser unexpected pause / stall recovery listener
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const handlePause = () => {
      if (player.state?.waiting || player.waiting) {
        setTimeout(() => {
          player.play().catch((err: any) => {
            console.error("[TV Recovery] Forced play failed:", err);
          });
        }, 1000);
      }
    };

    // `stalled` can fire many times a second while the network is degraded
    // (e.g. the server briefly rate-limiting us) — nudging play() on every
    // single event re-requests the manifest with no delay, which is itself
    // enough load to keep the network degraded, in a self-sustaining loop.
    // A short cooldown lets the nudge still recover a genuine one-off stall
    // without becoming a retry storm.
    let lastStallNudge = 0;
    const handleStalled = () => {
      const now = Date.now();
      if (now - lastStallNudge < 3000) return;
      lastStallNudge = now;
      if (player.paused) {
        player.play().catch(() => {});
      }
    };

    player.addEventListener('pause', handlePause);
    player.addEventListener('stalled', handleStalled);

    return () => {
      player.removeEventListener('pause', handlePause);
      player.removeEventListener('stalled', handleStalled);
    };
  }, [reloadTrigger, useProxy, playerRef]);

  const videoSrc = useMemo<PlayerSrc>(() => {
    const activeUrl =
      (useProxy ? streamUrl || rawStreamUrl : rawStreamUrl || streamUrl) || '';
    if (!activeUrl) return '';
    const isM3u8 =
      (rawStreamUrl && rawStreamUrl.toLowerCase().includes('m3u8')) ||
      activeUrl.toLowerCase().includes('m3u8');
    return {
      src: activeUrl,
      type: isM3u8 ? 'application/x-mpegurl' : 'video/mp4',
    } as PlayerSrc;
  }, [useProxy, streamUrl, rawStreamUrl]);

  return (
    <div
      className="h-dvh w-full bg-black"
      data-focusable="true"
      tabIndex={-1}
      style={{ '--video-fit-mode': fitMode } as React.CSSProperties}
    >
      <div
        ref={playerContainerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setIsTooltipVisible(false);
          setControlsVisible(false);
          setCursorVisible(false);
        }}
        className={`group relative h-full w-full overflow-hidden ${!cursorVisible && !controlsVisible ? 'cursor-none' : ''}`}
      >
        <MediaPlayer
          key={`${reloadTrigger}-${useProxy ? 'proxied' : 'direct'}`}
          className="media-provider h-full w-full"
          title={
            item?.title || seriesItem?.title || channelInfo?.name || 'Video'
          }
          src={videoSrc}
          viewType="video"
          streamType={contentType === 'tv' ? 'live' : 'on-demand'}
          googleCast={{
            autoJoinPolicy: 'origin_scoped' as any,
            language: 'en-US',
          }}
          playsInline
          autoplay
          load="eager"
          ref={playerRef}
          onProviderChange={onProviderChange}
          onCanPlay={handleCanPlay}
          onVolumeChange={handleVolumeChange}
          onTimeUpdate={handleTimeUpdate}
          onError={handleError}
          onEnded={handleEnded}
          onDoubleClick={() => {
            const isTouch = Date.now() - lastTouchTime.current < 500;
            if (isTizen || isTouch) return;
            remote.toggleFullscreen();
          }}
          keyDisabled={true}
        >
          <MediaProvider>
            {item?.subtitles?.map((sub: any, index: number) => (
              <track
                key={index}
                src={sub.url}
                kind="subtitles"
                label={sub.language}
                srcLang={sub.langCode}
                default={index === 0}
              />
            ))}
            {subtitles?.map((sub: any, index: number) => (
              <track
                key={`dynamic-sub-${sub.id}-${index}`}
                src={sub.src}
                kind="subtitles"
                label={sub.label}
                srcLang={sub.srclang}
              />
            ))}
          </MediaProvider>

          {/* Transparent Gesture Overlay to intercept touches on Vidstack media provider */}
          <div
            className="absolute inset-0 z-10 touch-none"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />

          <Captions
            className={`media-captions pointer-events-none absolute left-0 right-0 z-10 select-none wrap-break-word text-center transition-[bottom] duration-300 ease-in-out ${
              controlsVisible
                ? 'bottom-32 md:bottom-40'
                : 'bottom-10 md:bottom-12'
            }`}
          />

          <div
            className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0'} ${seekOverlay?.isLeftRight ? 'seek-bar-only' : ''}`}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <TopBar onBack={onBack} />

            {contentType === 'tv' ? (
              <TVControls />
            ) : (
              <>
                <SeekOverlay seekOverlay={seekOverlay} />
                <VODControls />
              </>
            )}
          </div>

          {showChannelList &&
            contentType === 'tv' &&
            channels &&
            onChannelSelect && (
              <div onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                <TvChannelList
                  ref={tvChannelListRef}
                  channels={channels}
                  channelGroups={channelGroups || []}
                  onChannelSelect={(item) => {
                    onChannelSelect(item);
                    setShowChannelList(false);
                  }}
                  onBack={() => setShowChannelList(false)}
                  currentItemId={itemId}
                  isOverlay={true}
                  favorites={favorites}
                  recentChannels={recentChannels}
                />
              </div>
            )}

          {showEpisodeList &&
            episodes &&
            onEpisodeSelect && (
              <div onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                <EpisodeOverlay
                  ref={episodeOverlayRef}
                  episodes={episodes}
                  onEpisodeSelect={(item) => {
                    onEpisodeSelect(item);
                    setShowEpisodeList(false);
                  }}
                  onBack={() => setShowEpisodeList(false)}
                  currentItemId={item?._episodeCardId || itemId}
                />
              </div>
            )}

          {isRecovering && (
            <div className="absolute z-50 flex h-full w-full flex-col items-center justify-center bg-gray-950/90 text-white backdrop-blur-md">
              <div className="relative mb-8 h-20 w-20">
                <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/20"></div>
                <div className="absolute inset-2 animate-pulse rounded-full bg-blue-500/30 blur-md"></div>
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-white/5 border-r-indigo-500 border-t-blue-500"></div>
                <div className="absolute inset-0 m-auto h-2 w-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
              </div>
              <div className="flex flex-col items-center space-y-2 text-center">
                <div className="bg-linear-to-r from-blue-400 to-indigo-400 bg-clip-text text-2xl font-bold tracking-wider text-transparent">
                  Connecting...
                </div>
                <div className="text-sm font-medium tracking-wide transition-colors duration-300">
                  {retryCount > 0 ? (
                    <span className="text-amber-400/90">
                      Retrying connection ({retryCount})...
                    </span>
                  ) : (
                    <span className="text-gray-400">
                      Establishing secure stream
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {streamError && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black pointer-events-none">
              <div className="w-[90%] max-w-md p-6 rounded-xl border border-zinc-800 bg-zinc-900/95 text-center shadow-2xl shadow-black/80 space-y-3">
                <h3 className="text-lg font-bold text-red-500 tracking-wide">
                  Error 404: Signal Not Found
                </h3>
                <p className="text-sm text-zinc-300 font-medium leading-relaxed px-2">
                  We are currently unable to fetch the broadcast from the provider. Please try again later
                </p>
              </div>
            </div>
          )}

          {previewChannelInfo && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
              <div className="rounded-lg bg-black bg-opacity-75 p-6 shadow-xl">
                <h2 className="text-center text-5xl font-bold text-white">
                  {previewChannelInfo.number}
                </h2>
                <h3 className="mt-2 text-center text-2xl text-gray-200">
                  {previewChannelInfo.name}
                </h3>
              </div>
            </div>
          )}

          {showExitToast && (
            <div className="pointer-events-none absolute bottom-20 left-1/2 z-100 -translate-x-1/2 rounded-full border border-gray-700 bg-black/90 px-6 py-3 text-white shadow-xl backdrop-blur-md transition-all duration-300">
              <span className="text-sm font-medium tracking-wide">
                Press BACK again to exit
              </span>
            </div>
          )}

          {showNextEpisodeButton && (
            <div className="absolute bottom-24 right-8 z-90 flex items-center gap-3">
              <button
                data-focusable="true"
                data-control="next-episode"
                onClick={() => {
                  setShowNextEpisodeButton(false);
                  playNextEpisode?.();
                }}
                className="flex items-center gap-2 px-5 py-3 rounded-lg border border-white/10 bg-black/80 text-white font-semibold shadow-lg backdrop-blur-md hover:bg-white/20 transition-all duration-200 outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-blue-600 focus:border-blue-400"
              >
                <span>Next Episode</span>
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" stroke="currentColor" strokeWidth="1" />
                </svg>
              </button>
            </div>
          )}

          <div
            ref={speedBannerRef}
            style={{ display: 'none' }}
            className="absolute top-10 left-1/2 -translate-x-1/2 z-100 pointer-events-none flex items-center gap-2 px-4 py-2 rounded-full border border-yellow-500/30 bg-black/80 shadow-lg backdrop-blur-xs"
          >
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
            <span className="text-yellow-500 text-xs font-bold tracking-wider uppercase">2x Speed Active</span>
          </div>

          <BufferingOverlay />
        </MediaPlayer>
      </div>
    </div>
  );
};

export default VideoPlayerContent;
