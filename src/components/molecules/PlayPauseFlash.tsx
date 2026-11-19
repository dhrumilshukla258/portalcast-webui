import React, { useEffect, useState } from 'react';
import { useMediaPlayer } from '@vidstack/react';
import { PauseIcon, PlayIcon } from 'lucide-react';

/**
 * Play / pause pressed (click, Space, a remote's OK): a big icon of the new state in the middle
 * that grows and fades, as on Netflix and the TV app. Not on the first state (the start).
 */
export const PlayPauseFlash: React.FC = () => {
  const player = useMediaPlayer();
  const [flash, setFlash] = useState<{ paused: boolean; n: number } | null>(null);
  useEffect(() => {
    if (!player) return;
    const show = (event: Event) => {
      // Startup and stream recovery also change `paused`. Only acknowledge a playback control.
      if (!player.state.started || !('request' in event) || !(event.request instanceof Event) ||
        event.request.type !== `media-${event.type}-request`) return;
      setFlash((f) => ({ paused: event.type === 'pause', n: (f?.n ?? 0) + 1 }));
    };
    const clear = () => setFlash(null);
    player.addEventListener('play', show);
    player.addEventListener('pause', show);
    player.addEventListener('source-change', clear);
    return () => {
      player.removeEventListener('play', show);
      player.removeEventListener('pause', show);
      player.removeEventListener('source-change', clear);
    };
  }, [player]);
  if (!flash) return null;
  return (
    <div
      key={flash.n}
      className="pc-flash pointer-events-none absolute left-1/2 top-1/2 z-30 flex h-24 w-24 items-center justify-center rounded-full bg-black/45 text-white md:h-28 md:w-28"
      onAnimationEnd={() => setFlash(null)}
    >
      {flash.paused ? <PauseIcon className="h-12 w-12 fill-current md:h-14 md:w-14" /> : <PlayIcon className="h-12 w-12 fill-current md:h-14 md:w-14" />}
    </div>
  );
};
