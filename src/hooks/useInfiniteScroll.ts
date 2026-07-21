import { useEffect } from 'react';
import type { MediaItem } from '@/types';

interface UseInfiniteScrollArgs {
  items: MediaItem[];
  loading: boolean;
  contentType: 'movie' | 'series' | 'tv';
  totalItemsCount: number;
  handlePageChange: (direction: number) => void;
  isDetailOpen: boolean;
  isRestoringFromHistory: React.MutableRefObject<boolean>;
  isFetchingMore: React.MutableRefObject<boolean>;
}

// Two effects that both ultimately call handlePageChange(1): one keeps
// loading pages until the content pane is tall enough to actually scroll
// (so a short category doesn't get stuck looking paginatable), the other
// is the actual scroll-near-bottom "load more" listener. Kept together
// since they're two triggers for the same infinite-scroll behavior and
// share the same guards.
export function useInfiniteScroll({
  items,
  loading,
  contentType,
  totalItemsCount,
  handlePageChange,
  isDetailOpen,
  isRestoringFromHistory,
  isFetchingMore,
}: UseInfiniteScrollArgs) {
  useEffect(() => {
    const isTizen = !!(window as Window & { tizen?: unknown }).tizen;
    if (isTizen || contentType === 'tv' || loading || isFetchingMore.current)
      return;

    if (isRestoringFromHistory.current) {
      return;
    }
    // A detail modal (e.g. opened from Discover) renders on top of and hides
    // MainContentGrid's own pane — #app-content-scroll then measures near-zero
    // height regardless of how many items are loaded, so this "keep loading
    // until the viewport is full" check can never actually be satisfied and
    // cascades through dozens of pages in the background (confirmed: opening
    // a title from Discover left `items` non-empty/stale from an earlier
    // browse, so the items.length===0 guard below didn't catch it either).
    // Bail while a detail item is open — nothing to fill, nothing visible.
    if (isDetailOpen) return;
    if (
      (items?.length || 0) === 0 ||
      (totalItemsCount > 0 && (items?.length || 0) >= totalItemsCount)
    )
      return;

    const timer = setTimeout(() => {
      // The page's own scroll (main.tsx/App.tsx) is fixed at 100vh — actual scrolling
      // happens inside MainContentGrid's own content pane (#app-content-scroll). Check
      // that container's fill state, not the document's, or this fires on every render.
      const pane = document.getElementById('app-content-scroll');
      if (!pane || pane.scrollHeight <= pane.clientHeight + 50) {
        handlePageChange(1);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [items, loading, contentType, totalItemsCount, handlePageChange, isDetailOpen, isRestoringFromHistory, isFetchingMore]);

  useEffect(() => {
    if (isDetailOpen) return;
    const pane = document.getElementById('app-content-scroll');
    if (!pane) return;

    const handleScroll = () => {
      const isTizen = !!(window as Window & { tizen?: unknown }).tizen;
      if (isTizen || contentType === 'tv') return;

      const buffer = 200;
      const isNearBottom =
        pane.scrollTop + pane.clientHeight >= pane.scrollHeight - buffer;
      if (isNearBottom) {
        handlePageChange(1);
      }
    };
    pane.addEventListener('scroll', handleScroll);
    return () => pane.removeEventListener('scroll', handleScroll);
  }, [contentType, handlePageChange, items, isDetailOpen]);
}
