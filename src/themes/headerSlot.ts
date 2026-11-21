// A spot in the theme's header that a page can show one of its own controls in (a React portal):
// Minimal shows Home's Filters next to search there, instead of a row of chips under the header.
import { useSyncExternalStore } from 'react';

let slot: HTMLElement | null = null;
const listeners = new Set<() => void>();

/** The header's ref callback for its slot element. */
export function setHeaderSlot(el: HTMLElement | null): void {
  if (el === slot) return;
  slot = el;
  listeners.forEach((l) => l());
}

/** The slot element, or null while no header has one. */
export function useHeaderSlot(): HTMLElement | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => slot,
  );
}
