import { isTizenDevice } from '@/utils/helpers';

/**
 * Minimal key/value persistence abstraction so the networking layer isn't
 * hard-wired to `localStorage`/the browser. A native client (Android TV,
 * Roku, etc.) can supply its own implementation (SharedPreferences, a
 * keychain, a file, ...).
 */
export interface TokenStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export type ClientType = 'web' | 'tizen';

/**
 * Everything the API layer needs from the host platform: where to persist
 * tokens, and what kind of client it's running as (sent to the server on
 * login so it can apply per-client-type session rules).
 */
export interface PlatformAdapter {
  storage: TokenStorage;
  clientType: ClientType;
}

const localStorageTokenStorage: TokenStorage = {
  get: (key) => localStorage.getItem(key),
  set: (key, value) => localStorage.setItem(key, value),
  remove: (key) => localStorage.removeItem(key),
};

// clientType is resolved once, at adapter-construction time, from the same
// signal the previous inline heuristic used (Tizen SDK presence / 1920x1080
// viewport) — see `isTizenDevice()` in `@/utils/helpers`. This replaces the
// per-request viewport sniffing that used to live inline in AuthContext.
export const webPlatformAdapter: PlatformAdapter = {
  storage: localStorageTokenStorage,
  clientType: isTizenDevice() ? 'tizen' : 'web',
};
