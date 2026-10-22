import React from 'react';
import { Loader2 } from 'lucide-react';
import MediaCard from '@/components/molecules/MediaCard';
import { getMyList } from '@/api/endpoints/discover';
import type { MediaItem } from '@/types';

interface MyListViewProps {
  onClick: (item: MediaItem) => void;
  loadingItemId: string | null;
  /** False while a title opened from here is shown over the page; read again when it closes. */
  active: boolean;
}

/**
 * The My List page (design-system.md, Screens): the viewer's saved titles, newest added first.
 * Read each time the page opens, since the list changes from detail pages and other devices.
 */
const MyListView: React.FC<MyListViewProps> = ({ onClick, loadingItemId, active }) => {
  const [items, setItems] = React.useState<MediaItem[] | null>(null);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    if (!active) return;
    let cancelled = false;
    getMyList().then(
      (list) => { if (!cancelled) setItems(list); },
      () => { if (!cancelled) setFailed(true); }
    );
    return () => {
      cancelled = true;
    };
  }, [active]);

  return (
    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-10 sm:px-0">
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="text-xl font-bold text-white sm:text-2xl">My List</h2>
        {items && items.length > 0 && (
          <span className="text-sm text-gray-400">{items.length} {items.length === 1 ? 'title' : 'titles'}</span>
        )}
      </div>
      {failed ? (
        <p className="text-gray-400">My List is not available on this server yet.</p>
      ) : items === null ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-white/60" /></div>
      ) : items.length === 0 ? (
        <p className="text-gray-400">Nothing here yet. Choose "Add to My List" on a movie or series to keep it here.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 md:gap-6 lg:grid-cols-6 xl:grid-cols-7">
          {items.map((item) => (
            <MediaCard key={String(item.id)} item={item} onClick={onClick} isLoading={loadingItemId === String(item.id)} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyListView;
