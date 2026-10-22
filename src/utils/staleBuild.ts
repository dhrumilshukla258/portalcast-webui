// After a deploy, a page loaded from the previous build still asks for that build's lazily
// loaded files (DiscoverView-<old hash>.js), which no longer exist: "Failed to fetch
// dynamically imported module". The fix is to load the new build, so the page reloads
// itself once instead of showing the error screen. A second failure within a minute is a
// real error (offline, server down) and is shown as usual.

const KEY = 'pc-stale-build-reload';

export function isStaleBuildError(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err ?? '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(msg);
}

/** Reloads the page once per minute at most; returns false when it already did. */
export function reloadForNewBuild(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // No sessionStorage (private mode): still reload; the browser's own cache rules apply.
  }
  window.location.reload();
  return true;
}

/** React.lazy loader that reloads into the new build instead of failing on a stale one. */
export function lazyImport<T>(load: () => Promise<T>): () => Promise<T> {
  return () =>
    load().catch((err) => {
      if (isStaleBuildError(err) && reloadForNewBuild()) return new Promise<T>(() => {});
      throw err;
    });
}

/** Vite's own signal for a failed preload of a lazy chunk. */
export function installStaleBuildHandler(): void {
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadForNewBuild()) event.preventDefault();
  });
}

/**
 * The offline cache (service worker) serves the previous build first and installs a new one in
 * the background; without this the new build only showed on a later visit (the owner kept
 * seeing old screens after a deploy, cookies cleared or not). When a new worker takes over,
 * the page reloads into it, but never while a video plays (it waits for that). New builds are
 * also looked for when the app comes back to the front and every 30 minutes.
 */
export function installServiceWorkerUpdates(): void {
  if (!('serviceWorker' in navigator)) return;
  const sw = navigator.serviceWorker;
  const hadController = !!sw.controller; // first install: nothing old on screen
  let pending = false;
  const playing = () => Array.from(document.querySelectorAll('video')).some((v) => !v.paused && !v.ended);
  const reloadWhenIdle = () => {
    if (!playing()) { window.location.reload(); return; }
    setTimeout(reloadWhenIdle, 30_000);
  };
  sw.addEventListener('controllerchange', () => {
    if (!hadController || pending) return;
    pending = true;
    reloadWhenIdle();
  });
  const check = () => { sw.getRegistration().then((r) => r?.update()).catch(() => {}); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
  setInterval(check, 30 * 60_000);
}
