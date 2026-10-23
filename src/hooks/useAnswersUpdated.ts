import { useEffect, useState } from 'react';
import { ANSWERS_UPDATED } from '@/api/responseCache';

/**
 * A number that goes up when a stored answer for a path starting with one of [prefixes] was shown
 * and the server's turned out different (api/responseCache.ts). Put it in an effect's
 * dependencies to load again: the fresh answer is in memory by then, so it costs no request.
 */
export function useAnswersUpdated(...prefixes: string[]): number {
  const [tick, setTick] = useState(0);
  const key = prefixes.join('|');
  useEffect(() => {
    const list = key.split('|');
    const onUpdate = (e: Event) => {
      const path = String((e as CustomEvent<{ path?: string }>).detail?.path ?? '');
      if (list.some((p) => path.startsWith(p))) setTick((t) => t + 1);
    };
    window.addEventListener(ANSWERS_UPDATED, onUpdate);
    return () => window.removeEventListener(ANSWERS_UPDATED, onUpdate);
  }, [key]);
  return tick;
}
