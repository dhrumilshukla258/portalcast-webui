import { reportSubtitleKept } from '@/api/endpoints/subtitles';

// The online subtitle a viewer kept on (owner 2026-11-04: "now we know this is the right
// subtitle file"). Once it has stayed on for a good part of the title, with its timing left alone
// for a minute, the server is told (POST /api/v2/subtitles/kept); its search then lists that file
// first for everyone watching the same movie or episode. Same rule as the TV app.

/**
 * How long it stays on, playing: at least a quarter of the title (owner 2026-11-13; it was capped
 * at 10 minutes), never under 3 minutes; 10 minutes when the length is unknown (or endless), as a
 * quarter cannot be measured then.
 */
export function keptThresholdMs(durationMs: number): number {
  if (!(durationMs > 0) || !Number.isFinite(durationMs)) return 10 * 60_000;
  return Math.max(3 * 60_000, durationMs / 4);
}

/** A changed timing counts once it has been left alone this long while playing. */
export const KEPT_DELAY_SETTLED_MS = 60_000;

/** The download id ("gd:…", "os:…") of an online subtitle track, from its src; null for others. */
export function onlineSubtitleKey(src: string | null | undefined): string | null {
  if (!src) return null;
  try {
    const u = new URL(src, window.location.origin);
    if (!u.pathname.endsWith('/api/v2/subtitles/download')) return null;
    const id = u.searchParams.get('id');
    if (id) return id;
    const fileId = u.searchParams.get('fileId');
    return fileId && /^\d+$/.test(fileId) ? `os:${fileId}` : null;
  } catch {
    return null;
  }
}

// What the search said about each online subtitle added to the player.
const details = new Map<string, { lang: string; label: string | null }>();

/** Remembers the language searched and the release name of an online subtitle added. */
export function noteOnlineSubtitle(key: string, lang: string, label: string | null): void {
  details.set(key, { lang, label });
}

export interface KeptTick {
  /** The online subtitle showing (null: none, or a built-in / local one). */
  key: string | null;
  playing: boolean;
  durationMs: number;
  delayMs: number;
  /** The playing stream's token (names the movie or episode). */
  token: string | null;
}

/** Counts playing time per online subtitle; call [tick] every [stepMs]. */
export function createKeptTracker(report: typeof reportSubtitleKept = reportSubtitleKept, stepMs = 1000) {
  let watchKey: string | null = null;
  let watchMs = 0;
  let settledMs = 0;
  let lastDelay = 0;
  let reported: string | null = null; // `${key}|${delay}`

  return {
    tick({ key, playing, durationMs, delayMs, token }: KeptTick): void {
      if (key !== watchKey) { watchKey = key; watchMs = 0; settledMs = 0; }
      if (delayMs !== lastDelay) { lastDelay = delayMs; settledMs = 0; }
      if (!key || !playing) return;
      watchMs += stepMs;
      settledMs += stepMs;
      if (watchMs < keptThresholdMs(durationMs) || settledMs < KEPT_DELAY_SETTLED_MS) return;
      if (reported === `${key}|${delayMs}` || !token) return;
      reported = `${key}|${delayMs}`;
      const d = details.get(key);
      void report(token, { id: key, lang: d?.lang || 'en', delayMs, label: d?.label ?? null });
    },
  };
}
