import type { PlatformAdapter } from '@/api/platform';

const SERVER_URL_STORAGE_KEY = 'server_url_override';

let activeAdapter: PlatformAdapter | null = null;

/**
 * Registers the platform adapter used to persist a runtime-settable server
 * URL override. Must be called once at app startup (see `main.tsx`) before
 * `getServerUrl()`/`setServerUrl()` are used.
 */
export function setPlatformAdapter(adapter: PlatformAdapter): void {
  activeAdapter = adapter;
}

export function getPlatformAdapter(): PlatformAdapter | null {
  return activeAdapter;
}

function buildDrivenHost(): string {
  return import.meta.env.VITE_API_HOST || 'http://localhost:3000';
}

/**
 * Resolves the server host. Prefers a runtime-persisted override (set via
 * `setServerUrl`, e.g. from an in-app "enter your server URL" flow) and
 * falls back to the build-time `VITE_API_HOST` env var — preserving the
 * exact behavior of the original `URL_PATHS.HOST`.
 */
export function getServerUrl(): string {
  const stored = activeAdapter?.storage.get(SERVER_URL_STORAGE_KEY);
  return stored || buildDrivenHost();
}

export function setServerUrl(url: string): void {
  activeAdapter?.storage.set(SERVER_URL_STORAGE_KEY, url);
}

// Kept for source compatibility with code migrated from `services/api.ts`,
// which referenced `URL_PATHS.HOST` directly instead of a function call.
// `HOST` is evaluated live via a getter so a runtime `setServerUrl()` call
// is reflected without needing a page reload.
export const URL_PATHS = {
  get HOST(): string {
    return getServerUrl();
  },
};

export function getBaseUrl(): string {
  const host = getServerUrl();
  return host === '/' ? '/api' : `${host}/api`;
}

// Static snapshot for call sites that previously imported the `BASE_URL`
// constant. Since `VITE_API_HOST` is a build-time env var and runtime
// overrides are new, this remains correct for all pre-existing usages.
export const BASE_URL = getBaseUrl();
