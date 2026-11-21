import React, { useMemo, useState, useEffect } from 'react';
import { FaChromecast } from 'react-icons/fa';
import {
  Maximize2,
  SettingsIcon,
  ShieldCheck,
  ShieldX,
  Shrink,
  SquareDashedBottomCode,
  MoreVertical,
} from 'lucide-react';

// --- Vidstack Native Hooks ---
import { useMediaState, useMediaRemote } from '@vidstack/react';

import {
  PlayIcon,
  PauseIcon,
  ListIcon,
  HeartSolidIcon,
  HeartOutlineIcon,
  FullscreenExitIcon,
  FullscreenIcon,
} from '@/components/atoms/Icons';
import { URL_PATHS } from '@/api/config';
import { SettingsMenu } from '@/components/molecules/SettingsMenu';
import { VolumeControl } from '@/components/molecules/VolumeControl';
import { useVideoContext } from '@/context/video';

const formatTimestamp = (timestamp: number): string => {
  if (isNaN(timestamp)) return '...';
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const TVControls = React.memo(() => {
  // 1. App-Specific State (From Context)
  const {
    channelInfo,
    previewChannelInfo,
    currentProgram,
    nextProgram,
    programProgress,
    liveTime,
    isFavorite,
    fitMode,
    isTizen,
    isSettingsMenuOpen,
    activeSettingsMenu,
    isReceiver,
    toggleChannelList: onToggleChannelList,
    cycleFitMode: onCycleFitMode,
    toggleFavorite: onToggleFavorite,
    setActiveSettingsMenu: onActiveSettingsMenuChange,
    setIsSettingsMenuOpen: onSetIsSettingsMenuOpen,
    refreshReceivers,
    useProxy,
    setUseProxy,
    controlsVisible,
  } = useVideoContext();

  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  useEffect(() => {
    if (!controlsVisible) {
      setIsMoreMenuOpen(false);
    }
  }, [controlsVisible]);

  // 2. Video-Specific State (From Vidstack Native Hooks)
  const remote = useMediaRemote(); // Used to send commands to the player
  const isPaused = useMediaState('paused');
  const isPlaying = !isPaused;
  const isFullscreen = useMediaState('fullscreen');

  const baseUrl = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
  const activeChannel = previewChannelInfo || channelInfo;

  const channelImgSrc = useMemo(() => {
    if (!activeChannel?.screenshot_uri) return null;
    return activeChannel.screenshot_uri.startsWith('http')
      ? activeChannel.screenshot_uri
      : `${baseUrl}/api/images${activeChannel.screenshot_uri}`;
  }, [activeChannel, baseUrl]);

  const currentProgName =
    currentProgram?.name || activeChannel?.name || 'Current Program';
  const currentProgTime = currentProgram
    ? `${formatTimestamp(parseInt(currentProgram.start_timestamp))} - ${formatTimestamp(parseInt(currentProgram.stop_timestamp))}`
    : previewChannelInfo
      ? '...'
      : 'Now';

  const nextProgName =
    nextProgram?.name || (previewChannelInfo ? '...' : 'Next Program');
  const nextProgTime = nextProgram
    ? formatTimestamp(parseInt(nextProgram.start_timestamp))
    : '...';

  return (
    <div className="pointer-events-auto absolute bottom-1 left-1 right-1 p-1 text-fg md:bottom-4 md:left-4 md:right-4 md:p-2.5">
      <div className="ui-player-panel rounded-lg p-1 shadow-2xl md:p-2.5">
        <div className="mb-0.5 flex items-center justify-between md:mb-2">
          <div className="flex min-w-0 items-center">
            {channelImgSrc && (
              <img
                src={channelImgSrc}
                alt={activeChannel?.name || 'Channel Logo'}
                className="mr-1.5 h-4 w-6 shrink-0 rounded-xs bg-black object-contain p-px md:mr-3 md:h-10 md:w-12"
              />
            )}
            <span className="text-base font-bold md:text-2xl">
              {activeChannel?.number}
            </span>
            <span className="ml-1.5 truncate text-sm font-semibold md:ml-4 md:text-xl">
              {activeChannel?.name}
            </span>
          </div>
          <div className="ml-1.5 shrink-0 text-xs text-fg-soft md:ml-4 md:text-lg">
            {liveTime}
          </div>
        </div>

        <div className="ml-8 md:ml-16">
          <div className="ui-player-now flex items-center justify-between rounded-xs p-0.5 px-1.5 md:p-1.5 md:px-3">
            <span className="truncate text-3xs font-semibold md:text-base">
              {currentProgName}
            </span>
            <span className="ml-1.5 shrink-0 text-[8px] md:text-sm">
              {currentProgTime}
            </span>
          </div>

          <div className="flex items-center justify-between p-0.5 px-1.5 md:p-1.5 md:px-3">
            <span className="text-3xs text-fg-soft md:text-base">
              {nextProgName}
            </span>
            <span className="text-[8px] text-fg-soft md:text-sm">
              {nextProgTime}
            </span>
          </div>
        </div>

        <div className="ui-player-track mt-0.5 h-0.5 w-full rounded-full md:mt-2 md:h-1.5">
          <div
            className="ui-player-progress h-0.5 rounded-full md:h-1.5"
            style={{ width: `${programProgress}%` }}
          />
        </div>

        <div className="mt-0.5 flex items-center justify-between px-1 text-sm text-fg-soft md:mt-2">
          <div className="flex items-center gap-1.5 md:gap-4">
            {/* Vidstack Remote actions mapped here */}
            <button
              data-focusable="true"
              data-control="play-pause"
              data-tip={isPaused ? 'Play' : 'Pause'}
              aria-label={isPaused ? 'Play' : 'Pause'}
              onClick={() => (isPaused ? remote.play() : remote.pause())}
              className="text-fg hover:text-accent"
            >
              {isPlaying ? (
                <PauseIcon className="h-4 w-4 md:h-6 md:w-6" />
              ) : (
                <PlayIcon className="h-4 w-4 md:h-6 md:w-6" />
              )}
            </button>
            <button
              data-focusable="true"
              onClick={onToggleChannelList}
              data-tip="Channels"
              aria-label="Channels"
              className="text-fg hover:text-accent"
            >
              <ListIcon className="h-4 w-4 md:h-6 md:w-6" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 md:gap-4">
            <button
              data-focusable="true"
              className="hidden md:block text-fg hover:text-accent"
              onClick={() => setUseProxy(!useProxy)}
              data-tip={useProxy ? 'Proxy on' : 'Proxy off'}
              aria-label="Proxy"
            >
              {!useProxy ? <ShieldX /> : <ShieldCheck />}
            </button>
            <button
              data-focusable="true"
              onClick={onCycleFitMode}
              className="hidden md:block text-fg hover:text-accent"
              data-tip={`Scale: ${fitMode === 'contain' ? 'fit' : fitMode === 'cover' ? 'fill' : 'stretch'}`}
              aria-label="Video scale"
            >
              {fitMode === 'contain' && (
                <Shrink className="h-5 w-5 md:h-6 md:w-6" />
              )}
              {fitMode === 'cover' && (
                <SquareDashedBottomCode className="h-5 w-5 md:h-6 md:w-6" />
              )}
              {fitMode === 'fill' && (
                <Maximize2 className="h-5 w-5 md:h-6 md:w-6" />
              )}
            </button>

            <div className="relative flex items-center gap-1.5">
              {!isReceiver && (
                <button
                  data-focusable="true"
                  onClick={() => {
                    refreshReceivers();
                    if (isSettingsMenuOpen && activeSettingsMenu === 'cast') {
                      onSetIsSettingsMenuOpen(false);
                    } else {
                      onSetIsSettingsMenuOpen(true);
                      onActiveSettingsMenuChange('cast');
                    }
                  }}
                  data-tip="Cast"
                  aria-label="Cast"
                  className="hidden md:block mr-1 text-fg hover:text-accent md:mr-2"
                >
                  <FaChromecast className="h-4 w-4 md:h-6 md:w-6" />
                </button>
              )}
              <div className="relative flex items-center justify-center">
                {
                  <button
                    data-focusable="true"
                    onClick={() => onSetIsSettingsMenuOpen((v) => !v)}
                    data-tip="Settings"
                    aria-label="Settings"
                    className="hidden md:block text-fg hover:text-accent"
                  >
                    <SettingsIcon className="h-4 w-4 md:h-6 md:w-6" />
                  </button>
                }
                {/* 👇 Menu ippo intha relative div-ku ulla irukkirathunala, correct-a button mela ukkarum */}
                <SettingsMenu />
              </div>
            </div>

            <button
              data-focusable="true"
              onClick={() => onToggleFavorite(activeChannel)}
              data-tip={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
              aria-label={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
              className="text-fg hover:text-yellow-400"
            >
              {isFavorite ? (
                <HeartSolidIcon className="h-4 w-4 text-yellow-400 md:h-6 md:w-6" />
              ) : (
                <HeartOutlineIcon className="h-4 w-4 md:h-6 md:w-6" />
              )}
            </button>

            {!isTizen && (
              <>
                <div className="[&_svg]:h-4! [&_svg]:w-4! md:[&_svg]:h-6! md:[&_svg]:w-6!">
                  <VolumeControl />
                </div>
                <button
                  data-focusable="true"
                  onClick={() => remote.toggleFullscreen()}
                  data-tip={isFullscreen ? 'Exit full screen' : 'Full screen'}
                  aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
                  className="text-fg hover:text-accent"
                >
                  {isFullscreen ? (
                    <FullscreenExitIcon className="h-4 w-4 md:h-6 md:w-6" />
                  ) : (
                    <FullscreenIcon className="h-4 w-4 md:h-6 md:w-6" />
                  )}
                </button>
              </>
            )}

            {/* Mobile More Options Button */}
            <div className="relative flex items-center justify-center md:hidden">
              <button
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className="text-fg hover:text-accent p-1.5 transition-colors"
                title="More Options"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              {isMoreMenuOpen && (
                <div className="more-options-menu absolute bottom-[calc(100%+12px)] right-0 z-50 flex w-48 origin-bottom-right flex-col rounded-xl border border-divider/40 bg-panel/95 p-2 text-sm text-fg shadow-[0_-10px_40px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                  <button
                    onClick={() => {
                      setUseProxy(!useProxy);
                      setIsMoreMenuOpen(false);
                    }}
                    className="flex items-center space-x-3 rounded-sm px-3 py-2 transition-colors hover:bg-interaction"
                  >
                    {!useProxy ? <ShieldX className="h-4 w-4 text-fg-muted" /> : <ShieldCheck className="h-4 w-4 text-green-400" />}
                    <span>Proxy: {useProxy ? 'On' : 'Off'}</span>
                  </button>

                  <button
                    onClick={() => {
                      onCycleFitMode();
                    }}
                    className="flex items-center space-x-3 rounded-sm px-3 py-2 transition-colors hover:bg-interaction"
                  >
                    {fitMode === 'contain' && <Shrink className="h-4 w-4 text-fg-muted" />}
                    {fitMode === 'cover' && <SquareDashedBottomCode className="h-4 w-4 text-fg-muted" />}
                    {fitMode === 'fill' && <Maximize2 className="h-4 w-4 text-fg-muted" />}
                    <span className="capitalize">{fitMode}</span>
                  </button>

                  {!isReceiver && (
                    <button
                      onClick={() => {
                        refreshReceivers();
                        onSetIsSettingsMenuOpen(true);
                        onActiveSettingsMenuChange('cast');
                        setIsMoreMenuOpen(false);
                      }}
                      className="flex items-center space-x-3 rounded-sm px-3 py-2 transition-colors hover:bg-interaction"
                    >
                      <FaChromecast className="h-4 w-4 text-fg-muted" />
                      <span>Cast</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onSetIsSettingsMenuOpen(true);
                      onActiveSettingsMenuChange('main');
                      setIsMoreMenuOpen(false);
                    }}
                    className="flex items-center space-x-3 rounded-sm px-3 py-2 transition-colors hover:bg-interaction"
                  >
                    <SettingsIcon className="h-4 w-4 text-fg-muted" />
                    <span>Settings</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

TVControls.displayName = 'TVControls';
