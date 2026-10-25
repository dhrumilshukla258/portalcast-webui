import { useEffect, useRef } from 'react';
import { TvRemote } from '@/tv/remote';

/** The TV apps' remote (tv/remote.ts), for the life of the app. Off while the player is up. */
export function useTvRemote(enabled: boolean, opts: { onBack: () => void; playerOpen: boolean; onNearEnd?: () => void }) {
  const latest = useRef(opts);
  latest.current = opts;
  useEffect(() => {
    if (!enabled) return;
    const remote = new TvRemote({
      onBack: () => latest.current.onBack(),
      isActive: () => !latest.current.playerOpen,
      onNearEnd: () => latest.current.onNearEnd?.(),
    });
    return remote.start();
  }, [enabled]);
}
