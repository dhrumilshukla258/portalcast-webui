import React, { useState, useEffect } from 'react';
import {
  Controls,
  PlayButton,
  TimeSlider,
  Time,
  FullscreenButton,
  useMediaState,
} from '@vidstack/react';
import {
  PauseIcon,
  PlayIcon,
  RotateCcw,
  RotateCw,
  MaximizeIcon,
  MinimizeIcon,
  Shrink,
  SquareDashedBottomCode,
  Maximize2,
  SettingsIcon,
  ShieldX,
  ShieldCheck,
  ListVideo,
  MoreVertical,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { FaChromecast } from 'react-icons/fa';

import { useVideoContext } from '@/context/video';
import { VolumeControl } from '@/components/molecules/VolumeControl';
import { SettingsMenu } from '../../molecules/SettingsMenu';
import { formatTime } from '@/utils/helpers';

/**
 * A small round icon button, named above it on hover or keyboard/remote focus: the TV app's
 * Netflix-style row (owner, 2026-10-24: "make the webui similar to TV android").
 */
const IconButton: React.FC<{
  label: string;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}> = ({ label, onClick, className = '', children }) => (
  <button
    type="button"
    data-focusable="true"
    onClick={onClick}
    aria-label={label}
    className={`group/btn relative flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/15 focus-visible:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 md:h-11 md:w-11 ${className}`}
  >
    {children}
    <span className="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap rounded-md bg-black/80 px-2 py-0.5 text-xs font-semibold opacity-0 transition-opacity group-hover/btn:opacity-100 group-focus-visible/btn:opacity-100 group-[.focused]/btn:opacity-100">
      {label}
    </span>
  </button>
);

const ICON = 'h-5 w-5 md:h-6 md:w-6';

export const VODControls = React.memo(() => {
  const isPaused = useMediaState('paused');
  const isFullscreen = useMediaState('fullscreen');
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const currentTime = useMediaState('currentTime');
  const duration = useMediaState('duration') || 0;

  const {
    item,
    seriesItem,
    fitMode,
    isTizen,
    isReceiver,
    cycleFitMode: onCycleFitMode,
    refreshReceivers,
    setActiveSettingsMenu: onActiveSettingsMenuChange,
    handleSkipButtonClick,
    setIsSettingsMenuOpen,
    isSettingsMenuOpen,
    activeSettingsMenu,
    useProxy,
    setUseProxy,
    episodes,
    setShowEpisodeList,
    seekOverlay,
    controlsVisible,
    playNextEpisode,
    playPrevEpisode,
  } = useVideoContext();

  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  useEffect(() => {
    if (!controlsVisible) {
      setIsMoreMenuOpen(false);
    }
  }, [controlsVisible]);

  const showTooltip = (seekOverlay !== null) || isDragging;
  const tooltipText = seekOverlay ? seekOverlay.time : formatTime(dragTime);
  const hasEpisodes = !!episodes && episodes.length > 0;

  // Bottom left, as on the TV: the series and the episode, or the movie and its year/genres.
  const title: string = seriesItem?.title || seriesItem?.name || item?.title || item?.name || '';
  const subtitle: string = seriesItem
    ? (item?.title || item?.name || '')
    : [item?.year, item?.genre || item?.genres_str].filter(Boolean).join(' · ');

  const toggleSettings = (menu: 'main' | 'cast') => {
    if (isSettingsMenuOpen && activeSettingsMenu === menu) {
      setIsSettingsMenuOpen(false);
    } else {
      setIsSettingsMenuOpen(true);
      onActiveSettingsMenuChange(menu);
    }
  };

  return (
    <div
      className="pointer-events-auto absolute bottom-0 left-0 right-0 px-4 pb-3 pt-24 md:px-14 md:pb-8 md:pt-40"
      style={{
        // Tall and soft: the picture shows through above the text.
        background:
          'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0) 100%)',
      }}
    >
      <Controls.Group className="w-full">
        {title && (
          <div className="mb-2 max-w-3xl md:mb-4">
            <h2 className="truncate text-lg font-semibold text-white md:text-3xl">{title}</h2>
            {subtitle && <p className="truncate text-sm text-gray-300 md:text-base">{subtitle}</p>}
          </div>
        )}

        {/* The buttons, above the bar (Netflix / the TV app). */}
        <div className="vod-controls-buttons-row flex items-end justify-between text-white">
          <div className="flex items-end gap-1 md:gap-2">
            <PlayButton
              data-focusable="true"
              data-control="play-pause"
              aria-label={isPaused ? 'Play' : 'Pause'}
              className="group/btn relative flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/15 focus-visible:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 md:h-11 md:w-11"
            >
              {isPaused ? <PlayIcon className={`${ICON} fill-current`} /> : <PauseIcon className={`${ICON} fill-current`} />}
              <span className="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap rounded-md bg-black/80 px-2 py-0.5 text-xs font-semibold opacity-0 transition-opacity group-hover/btn:opacity-100 group-focus-visible/btn:opacity-100">
                {isPaused ? 'Play' : 'Pause'}
              </span>
            </PlayButton>
            {hasEpisodes && (
              <IconButton label="Previous episode" onClick={playPrevEpisode}>
                <SkipBack className={ICON} />
              </IconButton>
            )}
            <IconButton label="Back 10 s" onClick={() => handleSkipButtonClick(-10)}>
              <RotateCcw className={ICON} />
            </IconButton>
            <IconButton label="Forward 10 s" onClick={() => handleSkipButtonClick(10)}>
              <RotateCw className={ICON} />
            </IconButton>
            {hasEpisodes && (
              <IconButton label="Next episode" onClick={playNextEpisode}>
                <SkipForward className={ICON} />
              </IconButton>
            )}
            {!isTizen && (
              <div className="ml-1 flex h-10 items-center [&_svg]:h-5! [&_svg]:w-5! md:h-11 md:[&_svg]:h-6! md:[&_svg]:w-6!">
                <VolumeControl />
              </div>
            )}
          </div>

          <div className="flex items-end gap-1 md:gap-2">
            {hasEpisodes && (
              <IconButton label="Episodes" onClick={() => setShowEpisodeList(true)} className="hidden md:flex">
                <ListVideo className={ICON} />
              </IconButton>
            )}
            {/* The menu is always there (phones open it from More); the button only on wider screens. */}
            <div className="relative flex items-end">
              <IconButton label="Settings" onClick={() => toggleSettings('main')} className="hidden md:flex">
                <SettingsIcon className={ICON} />
              </IconButton>
              <SettingsMenu />
            </div>
            {!isReceiver && (
              <IconButton label="Cast" onClick={() => { refreshReceivers(); toggleSettings('cast'); }} className="hidden md:flex">
                <FaChromecast className={ICON} />
              </IconButton>
            )}
            <IconButton label={useProxy ? 'Proxy: on' : 'Proxy: off'} onClick={() => setUseProxy(!useProxy)} className="hidden md:flex">
              {useProxy ? <ShieldCheck className={ICON} /> : <ShieldX className={ICON} />}
            </IconButton>
            <IconButton label={`Picture: ${fitMode}`} onClick={onCycleFitMode} className="hidden md:flex">
              {fitMode === 'contain' && <Shrink className={ICON} />}
              {fitMode === 'cover' && <SquareDashedBottomCode className={ICON} />}
              {fitMode === 'fill' && <Maximize2 className={ICON} />}
            </IconButton>
            {!isTizen && (
              <FullscreenButton
                data-focusable="true"
                data-control="fullscreen"
                aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
                className="group/btn relative flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/15 focus-visible:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 md:h-11 md:w-11"
              >
                {isFullscreen ? <MinimizeIcon className={ICON} /> : <MaximizeIcon className={ICON} />}
                <span className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-md bg-black/80 px-2 py-0.5 text-xs font-semibold opacity-0 transition-opacity group-hover/btn:opacity-100 group-focus-visible/btn:opacity-100">
                  {isFullscreen ? 'Exit full screen' : 'Full screen'}
                </span>
              </FullscreenButton>
            )}

            {/* Phones: the rest in a menu. */}
            <div className="relative flex items-center justify-center md:hidden">
              <button
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/15"
                aria-label="More options"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              {isMoreMenuOpen && (
                <div className="more-options-menu absolute bottom-[calc(100%+12px)] right-0 z-50 flex w-48 origin-bottom-right flex-col rounded-xl border border-gray-600/40 bg-gray-900/95 p-2 text-sm text-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                  <button
                    onClick={() => { setUseProxy(!useProxy); setIsMoreMenuOpen(false); }}
                    className="flex items-center space-x-3 rounded-sm px-3 py-2 transition-colors hover:bg-white/10"
                  >
                    {!useProxy ? <ShieldX className="h-4 w-4 text-gray-400" /> : <ShieldCheck className="h-4 w-4 text-green-400" />}
                    <span>Proxy: {useProxy ? 'On' : 'Off'}</span>
                  </button>
                  {!isReceiver && (
                    <button
                      onClick={() => { refreshReceivers(); setIsSettingsMenuOpen(true); onActiveSettingsMenuChange('cast'); setIsMoreMenuOpen(false); }}
                      className="flex items-center space-x-3 rounded-sm px-3 py-2 transition-colors hover:bg-white/10"
                    >
                      <FaChromecast className="h-4 w-4 text-gray-400" />
                      <span>Cast</span>
                    </button>
                  )}
                  {hasEpisodes && (
                    <button
                      onClick={() => { setShowEpisodeList(true); setIsMoreMenuOpen(false); }}
                      className="flex items-center space-x-3 rounded-sm px-3 py-2 transition-colors hover:bg-white/10"
                    >
                      <ListVideo className="h-4 w-4 text-gray-400" />
                      <span>Episodes</span>
                    </button>
                  )}
                  <button
                    onClick={() => { setIsSettingsMenuOpen(true); onActiveSettingsMenuChange('main'); setIsMoreMenuOpen(false); }}
                    className="flex items-center space-x-3 rounded-sm px-3 py-2 transition-colors hover:bg-white/10"
                  >
                    <SettingsIcon className="h-4 w-4 text-gray-400" />
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={() => { onCycleFitMode(); }}
                    className="flex items-center space-x-3 rounded-sm px-3 py-2 transition-colors hover:bg-white/10"
                  >
                    {fitMode === 'contain' && <Shrink className="h-4 w-4 text-gray-400" />}
                    {fitMode === 'cover' && <SquareDashedBottomCode className="h-4 w-4 text-gray-400" />}
                    {fitMode === 'fill' && <Maximize2 className="h-4 w-4 text-gray-400" />}
                    <span className="capitalize">{fitMode}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* The bar: thin at rest, thicker with the pointer or remote focus on it, a white handle
            ringed in blue, and where it will land while dragging or seeking. */}
        <div
          data-focusable="true"
          data-control="seekbar"
          className="group relative mt-2 flex h-6 w-full cursor-pointer items-center md:mt-3"
        >
          <TimeSlider.Root
            className="relative h-1 w-full transition-[height] duration-150 group-hover:h-2 group-[.focused]:h-2"
            tabIndex={-1} // Vidstack must not take native keyboard focus (remote navigation owns it).
            onDragStart={() => {
              setIsDragging(true);
              setDragTime(currentTime || 0);
            }}
            onDragEnd={() => setIsDragging(false)}
            onDragValueChange={(val) => setDragTime((val / 100) * duration)}
          >
            <TimeSlider.Track className="absolute h-full w-full rounded-full bg-white/25" />
            <TimeSlider.Progress
              className="absolute h-full rounded-full bg-white/40"
              style={{ width: 'var(--slider-progress)' }}
            />
            <TimeSlider.TrackFill
              className="absolute h-full rounded-full bg-blue-500"
              style={{ width: 'var(--slider-fill)' }}
            />

            {showTooltip && (
              <div
                className="pointer-events-none absolute bottom-full mb-4 -translate-x-1/2 rounded-md bg-black/80 px-2.5 py-1 text-sm font-semibold text-white shadow-md"
                style={{ left: 'var(--slider-fill)' }}
              >
                {tooltipText}
              </div>
            )}

            <TimeSlider.Thumb
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 ring-blue-500 transition group-hover:h-4 group-hover:w-4 group-hover:opacity-100 group-hover:ring-[3px] group-[.focused]:h-5 group-[.focused]:w-5 group-[.focused]:opacity-100 group-[.focused]:ring-[3px]"
              style={{ left: 'var(--slider-fill)' }}
            />
          </TimeSlider.Root>
        </div>

        <div className="flex items-center justify-between font-mono text-xs text-gray-200 md:text-sm">
          <Time type="current" />
          <span className="text-gray-400">
            <Time type="current" remainder /> · <Time type="duration" />
          </span>
        </div>
      </Controls.Group>
    </div>
  );
});

VODControls.displayName = 'VODControls';
