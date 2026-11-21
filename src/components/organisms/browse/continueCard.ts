import { useState } from 'react';
import type { MediaItem } from '@/types';
import { URL_PATHS } from '@/api/config';
import { useOpenTitle } from '@/context/PersonPageContext';
import { isContentId } from '@/utils/titleFormat';

/** A Continue Watching card's props: Classic's (ContinueWatching.tsx) and a theme's (registry). */
export interface ContinueCardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
  /** Asks first, then removes. */
  onRemove: () => void;
  /** Removes at once (the title menu has already asked). */
  onRemoveNow: () => void;
  /** Opens the title's page (null: it has none); `opening` while that loads. */
  onDetails: (() => void) | null;
  opening: boolean;
}

/** A progress record's image path as a URL (posters under /api/images, others as given). */
export const continueImageUrl = (path: string | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
  return path.startsWith('/api/') ? `${base}${path}` : `${base}/api/images${path}`;
};

/**
 * Details for a Continue Watching item (cards and Home's hero): opens its title's page as the
 * version being watched, no version picker. It takes a few seconds (the server resolves a fresh
 * stream link), hence `opening`. Null when the item has no page.
 */
export function useContinueDetails(item: MediaItem | undefined) {
  const openPage = useOpenTitle()?.openPage;
  const [opening, setOpening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyItem = item as any;
  const id = String(anyItem?.catalogId || '');
  if (!openPage || !isContentId(id)) return { openDetails: null, opening };
  const title = String(anyItem.cw_show_title || item?.title || item?.name || '');
  const page = { id, type: id.startsWith('series_') ? 'series' : 'movie', title, name: title, category: '*' } as MediaItem;
  return {
    openDetails: () => {
      setOpening(true);
      void openPage(page).finally(() => setOpening(false));
    },
    opening,
  };
}
