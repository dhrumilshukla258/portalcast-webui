import React, { useEffect, useRef, useState } from 'react';
import { useMediaState } from '@vidstack/react';
import { PauseIcon, PlayIcon } from 'lucide-react';

/**
 * Play / pause pressed (click, Space, a remote's OK): a big icon of the new state in the middle
 * that grows and fades, as on Netflix and the TV app. Not on the first state (the start).
 */
export const PlayPauseFlash: React.FC = () => {
  const paused = useMediaState('paused');
  const [flash, setFlash] = useState<{ paused: boolean; n: number } | null>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setFlash((f) => ({ paused, n: (f?.n ?? 0) + 1 }));
  }, [paused]);
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
