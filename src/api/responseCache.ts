import { api, onApiMutation, type RequestConfig } from '@/api/client';
import { getServerUrl } from '@/api/config';
import { readAnswer, writeAnswer, clearAnswers } from '@/utils/answerStore';

// Cache for catalog GETs (Discover, movie/series pages, categories, seasons, episodes, channels).
// The server answers these from memory already; this removes the round trip when the user
// switches tabs or comes back to a list, so the UI renders instantly.
//
// - Memory: TTL 10 min, LRU of 200 entries (a page is ~10–20 KB, so a few MB at most).
// - Storage (utils/answerStore.ts, IndexedDB): every answer is also kept in the browser, per user
//   and server. When memory has nothing (a reload, the next day) the stored answer is returned at
//   once and the server is asked in the background; a changed answer replaces it and
//   ANSWERS_UPDATED is sent, so the screen showing it reloads (from memory, no new request).
//   The same as the TV app's DiskCache (owner, 2026-10-22).
// - Cleared on sign-out and after content-changing requests (admin hide/rename/unhide,
//   settings; see onApiMutation in client.ts), so edits show immediately.
// - Never used for stream links or file resolution (callers decide; see movies.ts).
// - Only completed responses are stored; an aborted request is simply not cached.

const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 200;

/** Window event: a stored answer was shown and the server's differs. `detail.path` is its path. */
export const ANSWERS_UPDATED = 'portalcast-answers-updated';

const store = new Map<string, { at: number; data: unknown }>();
const revalidating = new Set<string>();

function keyOf(path: string, params?: Record<string, unknown>): string {
  if (!params) return path;
  const parts = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map((k) => `${k}=${String(params[k])}`);
  return `${path}?${parts.join('&')}`;
}

/** The stored copy's key: whose and which server's answer it is, so no one else ever sees it. */
function storedKeyOf(key: string): string | null {
  try {
    const user = JSON.parse(localStorage.getItem('auth_user') || 'null') as { id?: number } | null;
    if (!user?.id) return null;
    return `${user.id}@${getServerUrl()}|${key}`;
  } catch {
    return null;
  }
}

function remember(key: string, data: unknown): void {
  store.delete(key);
  store.set(key, { at: Date.now(), data: structuredClone(data) });
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

export function clearResponseCache(): void {
  store.clear();
  void clearAnswers();
}

onApiMutation(() => clearResponseCache());

/** The stored copy was shown: ask the server again; a changed answer replaces it and is announced. */
function revalidate(path: string, config: RequestConfig | undefined, key: string, storedKey: string, storedJson: string): void {
  if (revalidating.has(key)) return;
  revalidating.add(key);
  // Not the caller's signal: the screen may be gone, the answer is still worth keeping.
  const { signal: _signal, ...rest } = config ?? {};
  void _signal;
  api.get(path, rest)
    .then(({ data }) => {
      if (data === undefined || data === null) return;
      remember(key, data);
      const json = JSON.stringify(data);
      if (json === storedJson) return;
      void writeAnswer(storedKey, json);
      window.dispatchEvent(new CustomEvent(ANSWERS_UPDATED, { detail: { path } }));
    })
    .catch(() => { /* offline or failed: the stored copy stays */ })
    .finally(() => revalidating.delete(key));
}

export async function cachedGet<T>(path: string, config?: RequestConfig): Promise<T | undefined> {
  const key = keyOf(path, config?.params);
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    store.delete(key);
    store.set(key, hit); // LRU touch
    return structuredClone(hit.data) as T; // callers may mutate what they get
  }
  const storedKey = storedKeyOf(key);
  if (storedKey) {
    const json = await readAnswer(storedKey);
    if (json) {
      try {
        const data = JSON.parse(json) as T;
        remember(key, data);
        revalidate(path, config, key, storedKey, json);
        return data;
      } catch { /* unreadable: ask the server */ }
    }
  }
  const data = (await api.get<T>(path, config)).data;
  if (data !== undefined && data !== null) {
    remember(key, data);
    if (storedKey) void writeAnswer(storedKey, JSON.stringify(data));
  }
  return data;
}
