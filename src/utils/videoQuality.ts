// Display helpers for the decoded video, matching the server (content/mediaInfo.ts) and
// the TV app (VideoStats.kt). Pure.

/** "2160p" / "1440p" / "1080p" / "720p" / "576p" / "480p" / "SD"; letterboxed 1920x800 is 1080p. */
export function qualityLabel(width: number, height: number): string {
  const h = Math.max(height, Math.round((width * 9) / 16));
  if (h >= 2000) return '2160p';
  if (h >= 1300) return '1440p';
  if (h >= 1000) return '1080p';
  if (h >= 700) return '720p';
  if (h >= 560) return '576p';
  if (h >= 460) return '480p';
  return 'SD';
}

const STANDARD_RATES = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60, 100, 119.88, 120];

/** Snap a measured rate to the nearest broadcast/film rate when within 3%. */
export function snapFps(fps: number): number {
  let best = fps;
  let bestDiff = Infinity;
  for (const r of STANDARD_RATES) {
    const d = Math.abs(r - fps);
    if (d < bestDiff) { best = r; bestDiff = d; }
  }
  return bestDiff / best <= 0.03 ? best : Math.round(fps * 100) / 100;
}

export function formatFps(fps: number): string {
  return String(Number(fps.toFixed(3)));
}

/** "1080p · 23.976 fps · 1920×1080". */
export function describeVideo(width: number, height: number, fps: number | null): string {
  return [qualityLabel(width, height), fps ? `${formatFps(fps)} fps` : null, `${width}×${height}`]
    .filter(Boolean)
    .join(' · ');
}

/** When the "Next episode" button may appear: the last 5% of the episode, 30–90 s. */
export function nextEpisodeWindowSeconds(durationSec: number): number {
  return Math.min(90, Math.max(30, durationSec / 20));
}
