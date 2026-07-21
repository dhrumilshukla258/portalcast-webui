import { useEffect, useRef } from 'react';
import { getMedia } from '@/api/endpoints/movies';
import { getSeries } from '@/api/endpoints/series';
import type { MediaItem, ContextType } from '@/types';

interface UseLibraryBackgroundRefreshArgs {
  context: ContextType;
  items: MediaItem[];
  loading: boolean;
  contentType: 'movie' | 'series' | 'tv';
  setItems: React.Dispatch<React.SetStateAction<MediaItem[]>>;
}

// Silently refills backdrop_path/screenshot_uri on already-loaded items
// every 2 minutes. The backend's artwork lookup runs in the background
// and a never-before-seen item can load with an empty backdrop_path on
// its first request (cache miss), only getting one after that background
// job finishes — this picks it up without the user having to navigate
// away and back. Only patches those two fields on items already in the
// list by id: never touches loading/error state, never adds/removes/
// reorders items, and bails if the user has navigated to a different
// context by the time the response lands (so it can't clobber a genuine
// navigation with stale data). Reads current state via a ref instead of
// effect deps so the interval itself is only ever created once, not
// reset on every items/context change (which would otherwise mean it
// could go long stretches without ever actually firing).
export function useLibraryBackgroundRefresh({
  context,
  items,
  loading,
  contentType,
  setItems,
}: UseLibraryBackgroundRefreshArgs) {
  const stateRef = useRef({ context, items, loading, contentType });
  useEffect(() => {
    stateRef.current = { context, items, loading, contentType };
  }, [context, items, loading, contentType]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const { context: ctx, items: currentItems, loading: isLoading, contentType: type } =
        stateRef.current;
      if (type === 'tv' || ctx.search || isLoading || currentItems.length === 0) return;

      try {
        const params = {
          page: 1,
          pageAtaTime: 1,
          category: ctx.category,
          movieId: ctx.movieId,
          seasonId: ctx.seasonId,
          sort: ctx.sort,
        };
        const response = type === 'movie' ? await getMedia(params) : await getSeries(params);
        const fresh = response.data || [];
        if (fresh.length === 0) return;
        // The user may have navigated away while this request was in
        // flight — the ref will now point at a different context object.
        if (stateRef.current.context !== ctx) return;

        const freshById = new Map(fresh.map((i) => [String(i.id), i]));
        setItems((prevItems) =>
          prevItems.map((item) => {
            const match = freshById.get(String(item.id));
            if (!match) return item;
            const nextBackdrop = match.backdrop_path;
            const nextPoster = match.screenshot_uri;
            const backdropChanged = !!nextBackdrop && nextBackdrop !== item.backdrop_path;
            const posterChanged = !!nextPoster && nextPoster !== item.screenshot_uri;
            if (!backdropChanged && !posterChanged) return item;
            return {
              ...item,
              backdrop_path: nextBackdrop || item.backdrop_path,
              screenshot_uri: nextPoster || item.screenshot_uri,
            };
          })
        );
      } catch {
        // Best-effort — silently try again next interval.
      }
    }, 120000);
    return () => clearInterval(interval);
  }, [setItems]);
}
