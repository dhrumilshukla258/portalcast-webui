import { api, onApiMutation, type RequestConfig } from '@/api/client';

// In-memory cache for catalog GETs (Discover, movie/series pages, categories, seasons).
// The server answers these from memory already; this removes the round trip when the user
// switches tabs or comes back to a list, so the UI renders instantly.
//
// - TTL 10 min, LRU of 200 entries (a page is ~10–20 KB, so a few MB at most).
// - Cleared on sign-out and after content-changing requests (admin hide/rename/unhide,
//   settings; see onApiMutation in client.ts), so edits show immediately.
// - Never used for stream links or file resolution (callers decide; see movies.ts).
// - Only completed responses are stored; an aborted request is simply not cached.

const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 200;

const store = new Map<string, { at: number; data: unknown }>();

function keyOf(path: string, params?: Record<string, unknown>): string {
  if (!params) return path;
  const parts = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map((k) => `${k}=${String(params[k])}`);
  return `${path}?${parts.join('&')}`;
}

export function clearResponseCache(): void {
  store.clear();
}

onApiMutation(() => store.clear());

export async function cachedGet<T>(path: string, config?: RequestConfig): Promise<T | undefined> {
  const key = keyOf(path, config?.params);
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    store.delete(key);
    store.set(key, hit); // LRU touch
    return structuredClone(hit.data) as T; // callers may mutate what they get
  }
  const data = (await api.get<T>(path, config)).data;
  if (data !== undefined && data !== null) {
    store.delete(key);
    store.set(key, { at: Date.now(), data: structuredClone(data) });
    while (store.size > MAX_ENTRIES) {
      const oldest = store.keys().next().value;
      if (oldest === undefined) break;
      store.delete(oldest);
    }
  }
  return data;
}
