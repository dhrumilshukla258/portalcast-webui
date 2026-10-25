export const formatTime = (timeInSeconds: number): string => {
  if (isNaN(timeInSeconds) || timeInSeconds < 0) return '00:00';
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const paddedSeconds = seconds.toString().padStart(2, '0');
  const paddedMinutes = minutes.toString().padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }
  return `${paddedMinutes}:${paddedSeconds}`;
};

export const isTizenDevice = (): boolean => {
  if (typeof window === 'undefined') return false;

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mock_tizen') === 'true') {
    return true;
  }

  if ((window as Window & { tizen?: unknown }).tizen) return true;
  // The Samsung app opens this page from the server (platforms/tizen), where Tizen's own objects
  // are not given to the page: its browser says "SMART-TV ... Tizen".
  return /SMART-TV/i.test(navigator.userAgent) && /Tizen/i.test(navigator.userAgent);
};

/**
 * The LG TV app (platforms/webos: it opens this page from the server). LG's web engine says
 * "Web0S" in its user agent; the app's page also has PalmSystem (webOSSystem from webOS 22).
 */
export const isWebOSDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const w = window as Window & { PalmSystem?: unknown; webOSSystem?: unknown };
  if (w.PalmSystem || w.webOSSystem) return true;
  if (/\bWeb0S\b|\bwebOS\b/.test(navigator.userAgent)) return true;
  return new URLSearchParams(window.location.search).get('mock_webos') === 'true';
};

/**
 * A TV app driven by a remote (Samsung Tizen, LG webOS): pairing sign-in, D-pad focus, TV
 * player controls, Back twice to exit. Platform APIs (tizen.*) still check their own platform.
 */
export const isTvApp = (): boolean => isTizenDevice() || isWebOSDevice();

/** Leaves the TV app (Back twice on Home). */
export const exitTvApp = (): void => {
  if (isTizenDevice()) {
    try { (window as any).tizen?.application?.getCurrentApplication()?.exit(); } catch { /* not a Tizen app */ }
    return;
  }
  if (isWebOSDevice()) {
    try { (window as any).webOSSystem?.platformBack?.() ?? (window as any).PalmSystem?.platformBack?.(); } catch { /* older webOS */ }
    window.close();
  }
};
