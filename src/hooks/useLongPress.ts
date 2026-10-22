import { useCallback, useRef } from 'react';

const HOLD_MS = 500;
const MOVE_PX = 10;

/**
 * Hold (touch, 0.5 s) or right-click (mouse) on a card: `onHold`. A hold swallows the click
 * that follows it, so the card does not also open. Moving the finger (scrolling) cancels.
 */
export function useLongPress(onHold: (() => void) | undefined) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const held = useRef(false);
  const cancel = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; start.current = null; };

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!onHold || e.pointerType === 'mouse') return; // mouse: right-click instead
    held.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    timer.current = setTimeout(() => { held.current = true; timer.current = null; onHold(); }, HOLD_MS);
  }, [onHold]);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const s = start.current;
    if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > MOVE_PX) cancel();
  }, []);
  const onPointerUp = useCallback(() => cancel(), []);
  const onContextMenu = useCallback((e: React.MouseEvent) => {
    if (!onHold) return;
    e.preventDefault();
    if (!held.current) onHold(); // touch browsers also send contextmenu after a hold
  }, [onHold]);
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (held.current) { e.stopPropagation(); e.preventDefault(); held.current = false; }
  }, []);

  return onHold
    ? { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onPointerLeave: onPointerUp, onContextMenu, onClickCapture }
    : {};
}
