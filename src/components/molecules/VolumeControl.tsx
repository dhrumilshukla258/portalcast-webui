import React from 'react';
import { VolumeMutedIcon, VolumeUpIcon } from '@/components/atoms/Icons';
import { useMediaRemote, useMediaState } from '@vidstack/react';

export const VolumeControl = React.memo(() => {
  const volume = useMediaState('volume');
  const isMuted = useMediaState('muted');
  const remote = useMediaRemote();

  const isActuallyMuted = isMuted || volume === 0;

  return (
    <div className="group/volume relative flex items-center">
      <button
        onClick={() => remote.toggleMuted()}
        className="text-white transition-colors hover:text-accent focus:outline-hidden"
        aria-label={isActuallyMuted ? 'Unmute' : 'Mute'}
      >
        {isActuallyMuted ? (
          <VolumeMutedIcon className="h-5 w-5 md:h-7 md:w-7" />
        ) : (
          <VolumeUpIcon className="h-5 w-5 md:h-7 md:w-7" />
        )}
      </button>

      {/* A vertical bar above the icon while it is hovered or has focus. The padding under the
          pill keeps the hover alive on the way up to it. Rotated with transform (not writing-mode
          or the rotate property), which every supported browser has. */}
      <div className="pointer-events-none absolute bottom-full left-1/2 hidden -translate-x-1/2 pb-3 opacity-0 transition-opacity duration-200 group-hover/volume:pointer-events-auto group-hover/volume:opacity-100 group-focus-within/volume:pointer-events-auto group-focus-within/volume:opacity-100 md:block">
        <div className="ui-player-panel flex h-32 w-10 items-center justify-center rounded-full shadow-xl">
          <input
            data-control="volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            aria-label="Volume"
            value={isActuallyMuted ? 0 : volume}
            onChange={(e) => remote.changeVolume(parseFloat(e.target.value))}
            className="h-1 w-24 shrink-0 cursor-pointer accent-accent"
            style={{ transform: 'rotate(-90deg)' }}
          />
        </div>
      </div>
    </div>
  );
});

VolumeControl.displayName = 'VolumeControl';
