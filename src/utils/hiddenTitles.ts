import { useSyncExternalStore } from 'react';
import { getHiddenTitles } from '@/api/endpoints/user';

// The viewer's "Not interested" titles (content ids), kept here so every Home / Movies /
// Series row can leave them out: the server takes them off its personal rows, but What's new
// and the genre rows come from the shared catalog (owner: "I said not interested and it's
// still there"). IPTV categories, search and My List are left as they are.

let ids = new Set<string>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function loadHiddenTitles(): Promise<void> {
  try {
    ids = new Set(await getHiddenTitles());
    emit();
  } catch {
    // An older server has no list: nothing is left out.
  }
}

export function markHidden(id: string, hidden: boolean): void {
  const next = new Set(ids);
  if (hidden) next.add(id);
  else next.delete(id);
  ids = next;
  emit();
}

export function clearHiddenTitles(): void {
  ids = new Set();
  emit();
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const snapshot = () => ids;

/** The current set; components re-render when it changes. */
export function useHiddenTitles(): Set<string> {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
