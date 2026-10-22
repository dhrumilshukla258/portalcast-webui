// Small labels shared by cards and detail pages (design-system.md, Cards and Detail page).

/** "8.4" for a real rating above 0, else null (no badge). */
export function ratingLabel(r: string | number | undefined | null): string | null {
  const n = parseFloat(String(r ?? ''));
  return n > 0 ? n.toFixed(1) : null;
}

/** "23 min left", "1h 12m left"; undefined under a minute or when unknown. */
export function timeLeft(seconds: number): string | undefined {
  if (!Number.isFinite(seconds)) return undefined;
  const min = Math.floor(seconds / 60);
  if (min < 1) return undefined;
  return min < 60 ? `${min} min left` : `${Math.floor(min / 60)}h ${min % 60}m left`;
}

/** A catalog id the server's My List and More Like This accept ("movie_123", "series_45"). */
export const isContentId = (id: string) => /^(movie|series)_[\w.-]{1,120}$/.test(id);
