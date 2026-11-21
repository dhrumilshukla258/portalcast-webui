/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import type { ProgressRecord } from '@/api/types/user';
import { URL_PATHS } from '@/api/config';
import { getTitleDetails, type TitleDetails } from '@/api/endpoints/discover';
import { continueItemsOf } from '@/utils/continueItems';
import { isContentId } from '@/utils/titleFormat';
import { useContinueDetails } from './continueCard';

const urlOf = (path: string | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
  return path.startsWith('/api/') ? `${base}${path}` : `${base}/api/images${path}`;
};

/** The title last watched, with its details and art, for a theme's hero. Null: nothing to resume. */
export function useContinueHero(progressRecords: ProgressRecord[]) {
  const item = React.useMemo(() => continueItemsOf(progressRecords)[0], [progressRecords]);
  const anyItem = item as any;
  const catalogId: string = item?.catalogId ? String(item.catalogId) : '';
  const [details, setDetails] = React.useState<TitleDetails | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    setDetails(null);
    if (!isContentId(catalogId)) return;
    void getTitleDetails({ id: catalogId }).then((d) => {
      if (!cancelled) setDetails(d);
    });
    return () => {
      cancelled = true;
    };
  }, [catalogId]);
  const [artFailed, setArtFailed] = React.useState(false);
  const { openDetails, opening } = useContinueDetails(item);
  React.useEffect(() => setArtFailed(false), [anyItem?.cw_backdrop]);
  if (!item) return null;
  const title = (anyItem.cw_show_title || item.title || item.name || '') as string;

  return {
    item,
    details,
    title,
    openDetails,
    detailsLoading: opening,
    art: artFailed ? null : urlOf(anyItem.cw_backdrop),
    onArtError: () => setArtFailed(true),
    detail: anyItem.cw_detail as string | undefined,
    pct: Math.min(100, Math.max(0, Number(item.progressPercent) || 0)),
  };
}
