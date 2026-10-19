// Per-title subtitle timing offset for the web player, applied by shifting the loaded
// cues (VTTCue start/end are writable), so it works for every text track: built-in,
// online (OpenSubtitles) and local files. Saved per title in localStorage.
//
// Module-level store so the settings menu (which mounts and unmounts with the controls)
// and the player share one value.

type Listener = () => void;

interface CueLike { startTime: number; endTime: number }
interface TrackLike { cues?: ArrayLike<CueLike> | readonly CueLike[] | null }

let key: string | null = null;
let delayMs = 0;
let getTracks: (() => TrackLike[]) | null = null;
const applied = new WeakMap<object, number>(); // cue -> offset (s) already applied
const listeners = new Set<Listener>();

const storageKey = (k: string) => `subtitleDelay:${k}`;

function read(k: string): number {
  try { return Number(localStorage.getItem(storageKey(k))) || 0; } catch { return 0; }
}

function write(k: string, ms: number): void {
  try {
    if (ms === 0) localStorage.removeItem(storageKey(k));
    else localStorage.setItem(storageKey(k), String(ms));
  } catch { /* private mode etc. — per-session only */ }
}

/** Shift every loaded cue to the current offset (idempotent; only the difference is applied). */
export function applySubtitleDelay(): void {
  if (!getTracks) return;
  const want = delayMs / 1000;
  for (const t of getTracks()) {
    const cues = t?.cues;
    if (!cues) continue;
    for (let i = 0; i < cues.length; i++) {
      const c = cues[i] as CueLike & object;
      const have = applied.get(c) ?? 0;
      const d = want - have;
      if (d === 0) continue;
      c.startTime = Math.max(0, c.startTime + d);
      c.endTime = Math.max(c.startTime, c.endTime + d);
      applied.set(c, want);
    }
  }
}

/** Called by the player when the title or its tracks change. */
export function bindSubtitleDelay(titleKey: string | null, tracks: (() => TrackLike[]) | null): void {
  getTracks = tracks;
  if (titleKey !== key) {
    key = titleKey;
    delayMs = titleKey ? read(titleKey) : 0;
    listeners.forEach((l) => l());
  }
  applySubtitleDelay();
}

export function getSubtitleDelay(): number {
  return delayMs;
}

export function setSubtitleDelay(ms: number): void {
  delayMs = Math.max(-60000, Math.min(60000, Math.round(ms)));
  if (key) write(key, delayMs);
  applySubtitleDelay();
  listeners.forEach((l) => l());
}

export function subscribeSubtitleDelay(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** "In sync" / "Later by 0.25 s" / "Earlier by 1.50 s". */
export function formatDelay(ms: number): string {
  if (ms === 0) return 'In sync';
  return `${ms > 0 ? 'Later' : 'Earlier'} by ${(Math.abs(ms) / 1000).toFixed(2)} s`;
}
