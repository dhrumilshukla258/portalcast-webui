/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useMemo, useState } from 'react';
import type { MediaItem } from '@/types';
import { URL_PATHS } from '@/api/config';
import { downsize, AMBIENT_BACKDROP } from '@/utils/imageSize';
import { continueItemsOf, type ProgressEntry } from '@/utils/continueItems';
import type { ProgressRecord } from '@/api/types/user';
import { deleteUserProgress, getUserProgress } from '@/api/endpoints/user';

interface ContinueWatchingProps {
  onClick: (item: MediaItem) => void;
  // Sourced from the already-loaded, app-level progress cache (useMediaLibrary)
  // instead of fetching independently here — this component used to do its own
  // getUserProgress() call on every mount, which meant every time the root VOD
  // view re-appeared (e.g. Back from a detail page) this row popped in late,
  // after the category header had already rendered, reading as a flicker.
  progressRecords: ProgressRecord[];
  onProgressChanged?: () => void;
}


const imageUrlOf = (path: string | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
  return path.startsWith('/api/') ? `${base}${path}` : `${base}/api/images${path}`;
};

/**
 * A Continue Watching card (design-system.md, Cards): 16:9 art (the title's backdrop, else
 * the poster cropped), a progress bar along its bottom, then the title and the episode and
 * time left.
 */
const ContinueCard: React.FC<{ item: MediaItem; onClick: (item: MediaItem) => void }> = React.memo(({ item, onClick }) => {
  const anyItem = item as any;
  const [failed, setFailed] = useState(false);
  const wide = imageUrlOf(anyItem.cw_backdrop);
  const poster = imageUrlOf(item.screenshot_uri);
  const src = !failed && wide ? downsize(wide, AMBIENT_BACKDROP) : poster ? downsize(poster, 'w342') : null;
  const title = anyItem.cw_show_title || item.title || item.name || '';
  const pct = Math.min(100, Math.max(0, Number(item.progressPercent) || 0));
  return (
    <div
      className="group cursor-pointer"
      onClick={() => onClick(item)}
      title={String(item.title || item.name || '')}
      data-focusable="true"
      tabIndex={-1}
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black/40 transition-all duration-300 group-hover:border-portalcast-light/50 group-hover:shadow-2xl group-hover:shadow-black/40 group-[.focused]:ring-2 group-[.focused]:ring-white">
        {src ? (
          <img
            src={src}
            alt={title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-white/10 to-transparent text-2xl font-bold text-white/30">
            {title.substring(0, 2).toUpperCase()}
          </div>
        )}
        <div className="absolute bottom-0 left-0 h-1 w-full bg-white/20">
          <div className="h-full bg-sky-400" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <h3 className="mt-2 truncate text-sm font-semibold text-white group-hover:text-portalcast-light md:text-base">{title}</h3>
      {anyItem.cw_detail && <p className="truncate text-xs text-gray-400 md:text-sm">{anyItem.cw_detail}</p>}
    </div>
  );
});

const ContinueWatching: React.FC<ContinueWatchingProps> = ({ onClick, progressRecords, onProgressChanged }) => {
  const inProgressItems = useMemo<MediaItem[]>(() => continueItemsOf(progressRecords), [progressRecords]);

  // Removing asks first (same as the TV app): the × opens a confirm, Cancel is the default.
  const [confirming, setConfirming] = useState<{ id: string; title: string } | null>(null);

  const handleDismiss = useCallback(
    async (targetId: string) => {
      try {
        await deleteUserProgress(targetId);
        // Also delete progress for any record referencing this ID as its parent/itemId
        const records = await getUserProgress();
        for (const record of records) {
          const entry = record.meta as ProgressEntry;
          if (
            entry &&
            (entry.id === targetId ||
              entry.itemId === targetId ||
              entry.mediaId === targetId ||
              record.mediaId === targetId)
          ) {
            await deleteUserProgress(record.mediaId);
          }
        }
        onProgressChanged?.();
      } catch (err) {
        console.error('Failed to dismiss item:', err);
      }
    },
    [onProgressChanged]
  );

  if (inProgressItems.length === 0) {
    return null;
  }

  return (
    <div className="content-transition mb-8 px-2 sm:px-0">
      <h2 className="mb-4 text-center text-xl font-bold text-white sm:text-left sm:text-2xl">
        Continue Watching
      </h2>
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-5 xl:grid-cols-4 2xl:grid-cols-5">
        {inProgressItems.map((item, index) => (
          <div key={`${item.id}-${index}`} className="group relative">
            <button
              className="absolute right-1 top-1 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity duration-200 hover:bg-red-600 focus:opacity-100 group-hover:opacity-100"
              style={{ lineHeight: 1 }}
              onClick={(e) => {
                e.stopPropagation();
                setConfirming({ id: String(item.id), title: String(item.title || item.name || 'this title') });
              }}
              title="Remove from Continue Watching"
              aria-label="Remove"
              data-focusable="true"
            >
              ×
            </button>
            <ContinueCard item={item} onClick={onClick} />
          </div>
        ))}
      </div>
      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setConfirming(null)}
          onKeyDown={(e) => { if (e.key === 'Escape') setConfirming(null); }}
          data-focus-group="cw-remove-confirm"
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1120]/[0.97] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="line-clamp-2 text-lg font-bold text-white">{confirming.title}</h3>
            <p className="mt-2 text-sm text-gray-400">Remove it from Continue Watching? Your place in it is forgotten.</p>
            <div className="mt-5 flex gap-3">
              <button
                data-focusable="true"
                onClick={() => { const id = confirming.id; setConfirming(null); handleDismiss(id); }}
                className="rounded-full bg-linear-to-r from-sky-400 to-blue-500 px-5 py-2 text-sm font-bold text-white focus:outline-hidden focus:ring-2 focus:ring-white [&.focused]:ring-2 [&.focused]:ring-white"
              >
                Remove
              </button>
              <button
                data-focusable="true"
                data-default-focus="true"
                autoFocus
                onClick={() => setConfirming(null)}
                className="rounded-full border border-white/15 px-5 py-2 text-sm font-bold text-gray-200 hover:bg-white/10 focus:outline-hidden focus:ring-2 focus:ring-white [&.focused]:ring-2 [&.focused]:ring-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContinueWatching;
