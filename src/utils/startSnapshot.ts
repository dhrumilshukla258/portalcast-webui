// The last Home seen (plan Phase 3a, "saved screens at start"): the server's rows and the
// viewer's progress, kept in this browser per user and shown at once on the next start while
// fresh ones load. Small (a few hundred KB at most), best effort: private mode or a full
// storage simply skips it. Cleared on sign-out (AuthContext).

const PREFIX = 'pc-snap:';
const MAX_CHARS = 1_500_000;

export function readSnapshot<T>(userId: number | string | undefined, key: string): T | null {
  if (userId === undefined || userId === null) return null;
  try {
    const raw = localStorage.getItem(`${PREFIX}${userId}:${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveSnapshot(userId: number | string | undefined, key: string, value: unknown): void {
  if (userId === undefined || userId === null) return;
  try {
    const raw = JSON.stringify(value);
    if (raw.length <= MAX_CHARS) localStorage.setItem(`${PREFIX}${userId}:${key}`, raw);
  } catch {
    // Full or not allowed: the next start just loads normally.
  }
}

export function clearSnapshots(): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) localStorage.removeItem(k);
    }
  } catch {
    // nothing to clear
  }
}
