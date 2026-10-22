/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useMemo, useState } from 'react';
import type { MediaItem } from '@/types';
import { URL_PATHS } from '@/api/config';
import { downsize, AMBIENT_BACKDROP } from '@/utils/imageSize';
import { continueItemsOf, type ProgressEntry } from '@/utils/continueItems';
import type { ProgressRecord } from '@/api/types/user';
import { deleteUserProgress, getUserProgress } from '@/api/endpoints/user';
import MediaCardRow from '@/components/organisms/browse/MediaCardRow';
import { useTitleMenu } from '@/context/TitleMenuContext';
import { useLongPress } from '@/hooks/useLongPress';

interface ContinueWatchingProps {
  onClick: (item: MediaItem) => void;
  // Sourced from the already-loaded, app-level progress cache (useMediaLibrary)
  // instead of fetching independently here — this component used to do its own
  // getUserProgress() call on every mount, which meant every time the root VOD
  // view re-appeared (e.g. Back from a detail page) this row popped in late,
  // after the category header had already rendered, reading as a flicker.
  progressRecords: ProgressRecord[];
  onProgressChanged?: () => void;
  // Home: the newest title is the hero above (ContinueHero), so the row starts at the second.
  skipFirst?: boolean;
}


const imageUrlOf = (path: string | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
  return path.startsWith('/api/') ? `${base}${path}` : `${base}/api/images${path}`;
};

/**
 * A Continue Watching card: the poster (else the backdrop, cropped) with a progress bar along
 * its bottom and "Episode · 23 min left" under it, the size of the other rows' posters. The
 * landscape art is the Home hero's (ContinueHero), above this row.
 */
const ContinueCard: React.FC<{ item: MediaItem; onClick: (item: MediaItem) => void; onRemove: () => void; onRemoveNow: () => void }> = React.memo(({ item, onClick, onRemove, onRemoveNow }) => {
  const anyItem = item as any;
  // The title menu (hold / right-click), with Remove from Continue Watching.
  const openMenu = useTitleMenu();
  const hold = useLongPress(openMenu ? () => openMenu(item, { onRemoveFromContinue: onRemoveNow }) : undefined);
  const [failed, setFailed] = useState(false);
  const poster = imageUrlOf(item.screenshot_uri);
  const wide = imageUrlOf(anyItem.cw_backdrop);
  const src = !failed && poster ? downsize(poster, 'w342') : wide ? downsize(wide, AMBIENT_BACKDROP) : null;
  const title = anyItem.cw_show_title || item.title || item.name || '';
  const pct = Math.min(100, Math.max(0, Number(item.progressPercent) || 0));
  return (
    <div
      className="group relative cursor-pointer"
      onClick={() => onClick(item)}
      {...hold}
      title={String(item.title || item.name || '')}
      data-focusable="true"
      tabIndex={-1}
    >
      <div className="relative aspect-2/3 w-full overflow-hidden rounded-md border border-white/10 bg-black/40 transition-all duration-300 group-hover:border-portalcast-light/50 group-hover:shadow-2xl group-hover:shadow-black/40 group-[.focused]:ring-2 group-[.focused]:ring-white sm:rounded-xl">
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
          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-white/10 to-transparent p-2 text-center text-sm font-bold text-white/60">
            {title}
          </div>
        )}
        {/* Always visible on a phone (no hover there); on hover elsewhere. */}
        <button
          className="absolute right-1 top-1 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white transition-opacity duration-200 hover:bg-red-600 focus:opacity-100 sm:h-6 sm:w-6 sm:opacity-0 sm:group-hover:opacity-100"
          style={{ lineHeight: 1 }}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Remove from Continue Watching"
          aria-label="Remove"
          data-focusable="true"
        >
          ×
        </button>
        <div className="absolute bottom-0 left-0 h-1 w-full bg-white/20">
          <div className="h-full bg-sky-400" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <h3 className="mt-2 hidden truncate text-sm font-semibold text-white group-hover:text-portalcast-light sm:block md:text-base">{title}</h3>
      {anyItem.cw_detail && <p className="mt-1 truncate text-xs text-gray-400 sm:mt-0 md:text-sm">{anyItem.cw_detail}</p>}
    </div>
  );
});

const ContinueWatching: React.FC<ContinueWatchingProps> = ({ onClick, progressRecords, onProgressChanged, skipFirst = false }) => {
  const inProgressItems = useMemo<MediaItem[]>(
    () => continueItemsOf(progressRecords).slice(skipFirst ? 1 : 0),
    [progressRecords, skipFirst]
  );

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
    <>
      {/* One row like every other (design: no wrapping onto more lines), portrait posters. */}
      <MediaCardRow
        title="Continue Watching"
        onClick={onClick}
        items={inProgressItems}
        loading={false}
        renderItem={(item) => (
          <ContinueCard
            item={item}
            onClick={onClick}
            onRemove={() => setConfirming({ id: String(item.id), title: String(item.title || item.name || 'this title') })}
            onRemoveNow={() => void handleDismiss(String(item.id))}
          />
        )}
      />
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
    </>
  );
};

export default ContinueWatching;
