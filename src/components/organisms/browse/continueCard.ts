import type { MediaItem } from '@/types';
import { URL_PATHS } from '@/api/config';

/** A Continue Watching card's props: Classic's (ContinueWatching.tsx) and a theme's (registry). */
export interface ContinueCardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
  /** Asks first, then removes. */
  onRemove: () => void;
  /** Removes at once (the title menu has already asked). */
  onRemoveNow: () => void;
}

/** A progress record's image path as a URL (posters under /api/images, others as given). */
export const continueImageUrl = (path: string | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
  return path.startsWith('/api/') ? `${base}${path}` : `${base}/api/images${path}`;
};
