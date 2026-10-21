import { useEffect, useRef } from 'react';

/**
 * Calls `fn` now and every `ms` while the page is visible; a hidden browser tab makes no
 * requests, and coming back refreshes at once. Each call gets an AbortSignal that is
 * aborted when the component unmounts.
 */
export function useVisiblePoll(fn: (signal: AbortSignal) => void | Promise<void>, ms: number, enabled = true): void {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    if (!enabled) return;
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setInterval> | null = null;
    const tick = () => { void fnRef.current(ctrl.signal); };
    const start = () => {
      if (timer) return;
      tick();
      timer = setInterval(tick, ms);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      ctrl.abort();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [ms, enabled]);
}
