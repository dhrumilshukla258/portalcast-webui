import type { MediaItem } from '@/types';

const SEASON_WORD = /\bseason\s*:?\s*(\d{1,3})\b/i;
const SEASON_SHORT = /\bS(\d{1,2})(?:E\d{1,3})?\b/i;

/**
 * A season's number as the server means it: `season_number` (the provider's, or the one the
 * server works out when it merges a show the provider lists in parts; episode details are looked
 * up by it), else "Season 7" or "S07" in its name, else its place in the list (1-based).
 * Never the first number in the name: "24", "9-1-1", "The 100" and "1883" are show names.
 * Check: node --experimental-strip-types scripts/season-number-check.ts
 */
export function seasonNumberOf(season: Pick<MediaItem, 'season_number' | 'title' | 'name'>, index: number): number {
  const raw = season.season_number;
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 0 && n < 1000) return n;
  }
  const text = `${season.title ?? ''} ${season.name ?? ''}`;
  const m = SEASON_WORD.exec(text) ?? SEASON_SHORT.exec(text);
  return m ? Number(m[1]) : index + 1;
}

/** "Season 3"; season 0 is TMDB's "Specials". */
export const seasonLabel = (n: number): string => (n === 0 ? 'Specials' : `Season ${n}`);
