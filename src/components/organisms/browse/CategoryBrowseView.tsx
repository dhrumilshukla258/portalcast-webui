import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MediaItem } from '@/types';
import { getMedia, getMovieCategories } from '@/api/endpoints/movies';
import { getSeries, getSeriesCategories } from '@/api/endpoints/series';
import MediaCard from '@/components/molecules/MediaCard';

interface CategoryBrowseViewProps {
  type: 'movie' | 'series';
  /** Open a title (App: the same path as Search results). */
  onOpenTitle: (item: MediaItem, isSeries: boolean) => void;
  /** Leave: back to the Movies / Series tab. */
  onClose: () => void;
}

interface Group { id: string; title: string }

/**
 * Browse by category (the IPTV portal's categories), in the new layout: a full-screen list of
 * categories, then a poster grid of the chosen one (endless scroll). Back (the arrow, Escape
 * or the phone's Back) goes from the grid to the list, then to the Movies / Series tab. Each
 * level is a browser history entry consumed here, so the app's own Back handling (the old
 * per-category screen) never sees it.
 */
const CategoryBrowseView: React.FC<CategoryBrowseViewProps> = ({ type, onOpenTitle, onClose }) => {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const request = useRef(0);
  const levels = useRef(0);
  const label = type === 'movie' ? 'Movies' : 'Series';

  useEffect(() => {
    (type === 'movie' ? getMovieCategories() : getSeriesCategories())
      .then((r) => setGroups([{ id: '*', title: `All ${label.toLowerCase()}` }, ...r.data.map((g) => ({ id: String(g.id), title: String(g.title) }))]))
      .catch(() => setGroups([]));
  }, [type, label]);

  // History: one entry for the page, one more while a category is open.
  const push = () => {
    window.history.pushState({ ...(window.history.state ?? {}), categoryBrowse: levels.current + 1 }, '');
    levels.current += 1;
  };
  useEffect(() => {
    push();
    const onPop = (e: PopStateEvent) => {
      // Ours only when it lands below our top entry: closing a title opened from here lands
      // on our top entry, and that Back is the app's.
      if (levels.current === 0 || (Number(e.state?.categoryBrowse) || 0) >= levels.current) return;
      e.stopImmediatePropagation();
      levels.current -= 1;
      if (levels.current >= 1) setGroup(null);
      else onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && levels.current > 0) window.history.back(); };
    window.addEventListener('popstate', onPop, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('popstate', onPop, true);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const back = () => { if (levels.current > 0) window.history.back(); else onClose(); };

  const load = useCallback(async (g: Group, p: number) => {
    const id = ++request.current;
    setLoading(true);
    try {
      const params = { category: g.id, page: p, sort: 'latest' };
      const r = type === 'movie' ? await getMedia(params) : await getSeries(params);
      if (request.current !== id) return;
      setItems((prev) => (p === 1 ? r.data || [] : [...prev, ...(r.data || [])]));
      setTotal(r.total_items ?? 0);
      setPage(p);
    } catch {
      /* the list stays as it is */
    } finally {
      if (request.current === id) setLoading(false);
    }
  }, [type]);

  const choose = (g: Group) => {
    push();
    setGroup(g);
    setItems([]);
    setTotal(0);
    void load(g, 1);
  };

  const sentinel = useRef<HTMLDivElement>(null);
  const hasMore = !!group && items.length < total;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || !group) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !loading) void load(group, page + 1);
    }, { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, group, page, load]);

  return (
    <div id="app-content-scroll" className="custom-scrollbar h-full min-h-0 overflow-y-auto px-3 pb-10 sm:px-6">
      <div className="sticky top-0 z-30 -mx-3 mb-3 flex items-center gap-2 border-b border-white/5 bg-[#05080F] px-2 py-2 sm:-mx-6 sm:px-5">
        <button data-focusable="true" onClick={back} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-lg font-bold text-white sm:text-xl">{group ? group.title : `${label} by category`}</h2>
        {group && total > 0 && <span className="shrink-0 text-sm text-gray-400">{total.toLocaleString()}</span>}
      </div>

      {!group && (
        groups === null ? (
          <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-sky-400" /></div>
        ) : (
          <div className="space-y-1">
            {groups.map((g) => (
              <button
                key={g.id}
                data-focusable="true"
                onClick={() => choose(g)}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left hover:bg-white/5 focus:bg-white/10 focus:outline-hidden [&.focused]:bg-white/10"
              >
                <span className="min-w-0 flex-1 truncate text-base font-semibold text-white">{g.title}</span>
                <ChevronRight className="h-5 w-5 shrink-0 text-gray-500" />
              </button>
            ))}
          </div>
        )
      )}

      {group && (
        <>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
            {items.map((item, i) => (
              <MediaCard key={`${item.id}-${i}`} item={item} onClick={(it) => onOpenTitle(it, type === 'series')} posterOnlyOnPhone />
            ))}
            {loading && items.length === 0 &&
              Array.from({ length: 12 }).map((_, i) => <div key={i} className="aspect-2/3 animate-pulse rounded-md bg-white/5 sm:rounded-xl" />)}
          </div>
          {!loading && items.length === 0 && <p className="py-16 text-center text-gray-400">Nothing in this category.</p>}
          <div ref={sentinel} className="h-8" />
          {loading && items.length > 0 && (
            <div className="flex justify-center py-6"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-sky-400" /></div>
          )}
        </>
      )}
    </div>
  );
};

export default CategoryBrowseView;
