// Image sizes per use (plan Phase 4): the smallest TMDB file that still looks sharp. Cards ask
// for w342 (w500 on high-density screens), the dimmed ambient backdrop for w780 instead of the
// original file (often several MB). Only ever smaller: other images (portal art, NAS art, a
// TMDB size already at or under the target) are unchanged.

const TMDB_SIZE = /(\/api\/images\/tmdb\/|image\.tmdb\.org\/t\/p\/)(w\d+|original)\//;

const widthOf = (size: string) => (size === 'original' ? Infinity : Number(size.slice(1)));

/** The same image at `target` (e.g. "w342") when the URL asks for a larger TMDB size. */
export function downsize(url: string, target: string): string {
  const m = TMDB_SIZE.exec(url);
  if (!m || !(widthOf(m[2]) > widthOf(target))) return url;
  return url.slice(0, m.index + m[1].length) + target + url.slice(m.index + m[1].length + m[2].length);
}

/** A card poster's src and srcSet: w342 at 1x, w500 at 2x (the browser picks). */
export function cardPoster(url: string): { src: string; srcSet?: string } {
  const small = downsize(url, 'w342');
  if (small === url) return { src: url };
  return { src: small, srcSet: `${small} 1x, ${downsize(url, 'w500')} 2x` };
}

export const AMBIENT_BACKDROP = 'w780';
