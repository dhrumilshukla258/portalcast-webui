import React from 'react';
import { Check, Plus } from 'lucide-react';
import MediaCard from '@/components/molecules/MediaCard';
import { getMyListIds, getSimilar, setInMyList } from '@/api/endpoints/discover';
import { useOpenTitle } from '@/context/PersonPageContext';
import { isContentId } from '@/utils/titleFormat';
import type { MediaItem } from '@/types';

/**
 * "Add to My List" / "In My List" next to Play (design-system.md, Detail page). Flips at
 * once and goes back if the server refuses; not shown when the server has no My List.
 */
export const MyListButton: React.FC<{ contentId: string }> = ({ contentId }) => {
  const [inList, setInList] = React.useState<boolean | null>(null);
  const saving = React.useRef(false);
  React.useEffect(() => {
    let cancelled = false;
    setInList(null);
    if (!isContentId(contentId)) return;
    void getMyListIds().then((ids) => {
      if (!cancelled && ids) setInList(ids.has(contentId));
    });
    return () => {
      cancelled = true;
    };
  }, [contentId]);
  if (inList === null) return null;
  const toggle = async () => {
    if (saving.current) return;
    saving.current = true;
    const was = inList;
    setInList(!was);
    try {
      await setInMyList(contentId, !was);
    } catch {
      setInList(was);
    } finally {
      saving.current = false;
    }
  };
  return (
    <button
      type="button"
      onClick={() => void toggle()}
      data-focusable="true"
      aria-pressed={inList}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 font-bold text-gray-200 transition-colors hover:bg-white/10"
    >
      {inList ? <Check size={18} className="text-sky-400" /> : <Plus size={18} />}
      <span>{inList ? 'In My List' : 'Add to My List'}</span>
    </button>
  );
};

/** The More Like This row under a title's details; nothing when there are no similar titles. */
export const MoreLikeThis: React.FC<{ contentId: string }> = ({ contentId }) => {
  const openTitle = useOpenTitle();
  const [items, setItems] = React.useState<MediaItem[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    setItems([]);
    if (!isContentId(contentId)) return;
    void getSimilar(contentId).then((list) => {
      if (!cancelled) setItems(list.filter((x) => String(x.id) !== contentId));
    });
    return () => {
      cancelled = true;
    };
  }, [contentId]);
  if (!openTitle || items.length === 0) return null;
  return (
    <div className="space-y-3 border-t border-white/10 p-4 sm:p-6">
      <h3 className="text-lg font-bold text-white">More Like This</h3>
      <div className="flex gap-3 overflow-x-auto px-1 pb-2 pt-1 custom-scrollbar sm:gap-4" data-focus-group="more-like-this">
        {items.map((item) => (
          <div key={String(item.id)} className="w-28 shrink-0 sm:w-36">
            <MediaCard item={item} onClick={openTitle.open} isLoading={openTitle.loadingItemId === String(item.id)} />
          </div>
        ))}
      </div>
    </div>
  );
};
