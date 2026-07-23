import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MediaCard from '@/components/molecules/MediaCard';
import type { MediaItem } from '@/types';

interface MediaCardRowProps {
  title: string;
  onClick: (item: MediaItem) => void;
  items: MediaItem[];
  loading: boolean;
  // Id of the card currently being resolved (e.g. Discover's variants check +
  // getMedia/getSeries) — shows a spinner on just that card instead of a dead
  // click while the async resolve is in flight.
  loadingItemId?: string | null;
  // More pages exist beyond `items` — fetched on demand (scrolling/arrowing
  // near the right edge) rather than all up front, so a row can grow to
  // however many titles actually exist instead of being capped at one page.
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

const MediaCardRow: React.FC<MediaCardRowProps> = ({
  title,
  onClick,
  items,
  loading,
  loadingItemId,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Netflix-style row: the strip itself has no visible scrollbar (hide-scrollbar),
  // so without these buttons there's no on-screen affordance at all that it
  // scrolls — mouse drag/trackpad/wheel work but aren't discoverable. Buttons
  // hide themselves at each end instead of always showing, so they don't imply
  // there's more content in a direction that's actually exhausted.
  //
  // Also triggers onLoadMore when scrolled near the right edge — canScrollRight
  // stays true (via hasMore) even at the current visual end, so the arrow
  // doesn't disappear and look like a dead end while more is still loadable.
  const NEAR_END_PX = 400;
  // `onLoadMore` is a fresh inline closure from the caller on every render
  // (e.g. DiscoverView's `onLoadMore={() => loadMoreGenreRow(genre, ...)}`),
  // so this can't be a stable useCallback dependency — putting it in an
  // effect's dependency array reintroduces exactly the loop React's error
  // #185 warns about (effect depends on something that changes every
  // render -> setState -> render -> new closure -> effect fires again). A
  // ref sidesteps that: callers can still be as unstable as they like, this
  // only ever reads the latest one, never depends on its identity.
  const updateScrollButtonsRef = useRef<() => void>(() => {});
  updateScrollButtonsRef.current = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    const distanceFromEnd = el.scrollWidth - (el.scrollLeft + el.clientWidth);
    setCanScrollRight(distanceFromEnd > 4 || hasMore);
    if (distanceFromEnd < NEAR_END_PX && hasMore && !loadingMore) {
      // Deferred instead of called synchronously — a row that doesn't fill
      // the viewport keeps auto-loading more pages as each one resolves, and
      // when those resolve near-instantly (server cache hits, as they do
      // right after a Discover remount reloads every genre row from empty),
      // each resolution's setState->effect->onLoadMore chain can fire faster
      // than the browser ever gets to paint. React counts that as nested
      // updates that never settle and throws "Maximum update depth exceeded"
      // (error #185) even though every individual step here is legitimate.
      // A macrotask boundary lets a paint happen in between, breaking the
      // chain up without changing the actual auto-load-more behavior.
      setTimeout(() => onLoadMore?.(), 0);
    }
  };
  const updateScrollButtons = useCallback(() => {
    updateScrollButtonsRef.current();
  }, []);

  // Native scroll fires dozens of times per second during a drag/momentum
  // scroll, each one previously running a setState directly — with several
  // rows mounted at once (Discover routinely has 6+), that's a lot of
  // redundant re-renders for what's visually a continuous gesture. rAF
  // coalesces them to at most once per paint frame, which is all a visual
  // arrow-visibility update actually needs.
  const scrollRaf = useRef<number | null>(null);
  const onRowScroll = useCallback(() => {
    if (scrollRaf.current !== null) return;
    scrollRaf.current = requestAnimationFrame(() => {
      scrollRaf.current = null;
      updateScrollButtons();
    });
  }, [updateScrollButtons]);

  useEffect(() => {
    return () => {
      if (scrollRaf.current !== null) cancelAnimationFrame(scrollRaf.current);
    };
  }, []);

  useEffect(() => {
    updateScrollButtons();
  }, [items, updateScrollButtons]);

  const scrollBy = (direction: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: 'smooth' });
    // Clicking the right arrow at the true end doesn't fire a 'scroll' event
    // (nothing left to scroll to yet) — check directly so the click itself
    // can trigger the fetch instead of requiring a second click after items
    // are only appended, not scrolled to.
    if (direction === 1) {
      setTimeout(updateScrollButtons, 350);
    }
  };

  // Nothing to show and nothing coming — genuinely hide the row (e.g. a
  // genre with zero titles for the active type). `loading` is checked
  // separately below so a row mid-refresh still renders (as a skeleton)
  // even though its items were just cleared to [] for that refresh.
  if (!loading && items.length === 0) {
    return null;
  }

  // Skeleton in place of stale content while this row's data is being
  // replaced (a Movies/Series toggle, a genre-list refresh) — matches how
  // Netflix/Prime handle a row's content changing outright: clear to a
  // placeholder immediately, fade the real thing in once it's ready,
  // instead of crossfading old content into new or leaving stale content up
  // until the new fetch overwrites it mid-frame.
  if (loading) {
    return (
      <div className="content-transition group/row relative mb-8 px-2 sm:px-0">
        <h2 className="mb-4 text-center text-xl font-bold text-white sm:text-left sm:text-2xl">
          {title}
        </h2>
        <div className="flex gap-2 overflow-hidden sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-2/3 w-[31%] shrink-0 animate-pulse rounded-xl bg-white/5 sm:w-[23%] md:w-[18.5%] lg:w-[15.3%] xl:w-[13%]"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="content-transition group/row relative mb-8 px-2 sm:px-0">
      <h2 className="mb-4 text-center text-xl font-bold text-white sm:text-left sm:text-2xl">
        {title}
      </h2>

      {canScrollLeft && (
        <button
          onClick={() => scrollBy(-1)}
          aria-label="Scroll left"
          className="absolute bottom-0 left-0 top-6 z-10 hidden w-10 items-center justify-center bg-linear-to-r from-black/60 to-transparent text-white opacity-70 transition-opacity hover:opacity-100! sm:flex"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={onRowScroll}
        // overflow-y-hidden is deliberate, not decorative — leaving overflow-y
        // at its default `visible` alongside overflow-x-auto makes the browser
        // silently promote it to `auto` too (a scrollable axis can't coexist
        // with a visible one per spec). A hovered card's scale(1.03) can then
        // nudge this row's computed scroll height by a hair, giving it a real
        // (invisible) vertical scroll range — wheel-down gets consumed
        // scrolling that sliver internally instead of bubbling to the page,
        // while wheel-up still bubbles fine since scrollTop's already 0.
        className="hide-scrollbar row-content-fade-in flex gap-2 overflow-x-auto overflow-y-hidden scroll-smooth pb-1 sm:gap-4"
      >
        {/* Percentage widths matching MainContentGrid/the filtered Discover
            grid's own grid-cols-3/4/5/6/7 columns at each breakpoint (see
            those grids' className) — fixed px widths here previously meant
            these row tiles rendered a different size than the grid ones. */}
        {items.map((item, index) => (
          <div key={`${item.id}-${index}`} className="w-[31%] shrink-0 sm:w-[23%] md:w-[18.5%] lg:w-[15.3%] xl:w-[13%]">
            <MediaCard item={item} onClick={onClick} isLoading={loadingItemId === item.id} />
          </div>
        ))}
        {loadingMore && (
          <div className="flex w-[31%] shrink-0 items-center justify-center sm:w-[23%] md:w-[18.5%] lg:w-[15.3%] xl:w-[13%]">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500" />
          </div>
        )}
      </div>

      {canScrollRight && (
        <button
          onClick={() => scrollBy(1)}
          aria-label="Scroll right"
          className="absolute bottom-0 right-0 top-6 z-10 hidden w-10 items-center justify-center bg-linear-to-l from-black/60 to-transparent text-white opacity-70 transition-opacity hover:opacity-100! sm:flex"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}
    </div>
  );
};

export default MediaCardRow;
