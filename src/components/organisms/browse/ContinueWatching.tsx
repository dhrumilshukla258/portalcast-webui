/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useMemo } from 'react';
import MediaCard from '@/components/molecules/MediaCard';
import type { MediaItem } from '@/types';
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

interface ProgressEntry {
  id?: string;
  mediaId: string;
  itemId?: string;
  type: string;
  title: string;
  name?: string;
  episodeTitle?: string;
  screenshot_uri?: string;
  is_series?: number;
  cmd?: string;
  series_number?: number;
  catalogId?: string;
  currentTime: number;
  duration: number;
  progressPercent: number;
  timestamp: number;
}

const ContinueWatching: React.FC<ContinueWatchingProps> = ({ onClick, progressRecords, onProgressChanged }) => {
  const inProgressItems = useMemo<MediaItem[]>(() => {
    const items: MediaItem[] = [];
    const addedIds = new Set<string>();

    const sortedRecords = progressRecords
      .filter((record) => !record.completed && record.meta && record.meta.type !== 'tv')
      .sort((a, b) => {
        const timeA = a.meta.timestamp || 0;
        const timeB = b.meta.timestamp || 0;
        return timeB - timeA;
      });

    const completedMediaIds = new Set(
      progressRecords.filter((r) => r.completed).map((r) => r.mediaId)
    );

    for (const record of sortedRecords) {
      try {
        const entry = record.meta as ProgressEntry;
        const displayId = entry.id || entry.itemId || entry.mediaId || record.mediaId;

        if (!displayId || addedIds.has(displayId.toString())) continue;
        if (completedMediaIds.has(displayId.toString())) continue;

        const isSeries = (entry.is_series ?? 0) === 1;
        // entry.mediaId is the EPISODE's own playback-file id (see saveProgress
        // in useProgressTracking.ts — it's the raw `mediaId` the video element
        // is playing), not the series' own id — using it as series_id below
        // meant playContinueWatching's follow-up "fetch this series' episode
        // list" call always asked for a series matching an episode's id,
        // which never exists, so the episode list came back empty and
        // autoplay/next-episode silently did nothing on every resume,
        // regardless of which series or episode. entry.catalogId carries the
        // real portal series id (stamped as `series_{realId}` whenever a
        // series is opened normally — see setCurrentSeriesItem in
        // useAppNavigation.ts — and persisted into every progress save from
        // then on), so prefer stripping that instead; entry.mediaId stays as
        // a fallback for any older saved record from before catalogId existed.
        const seriesIdFromCatalog = entry.catalogId?.startsWith('series_')
          ? entry.catalogId.slice('series_'.length)
          : undefined;

        items.push({
          id: displayId.toString(),
          series_id: isSeries ? (seriesIdFromCatalog || entry.mediaId) : undefined,
          season_id: isSeries ? (entry as any).seasonId || undefined : undefined,

          title: isSeries
            ? `${entry.title}${entry.episodeTitle ? ' – ' + entry.episodeTitle : ''}`
            : entry.title,
          name: isSeries
            ? `${entry.name || entry.title}${entry.episodeTitle ? ' – ' + entry.episodeTitle : ''}`
            : entry.name || entry.title,
          // Pure series name, kept separate from the composite "Series –
          // Episode" display string above — playContinueWatching uses this
          // (not .title/.name) when it re-derives currentSeriesItem, so a
          // second play from this Continue Watching card doesn't save the
          // already-composed display string as if it were the series' own
          // name, which would double the episode-quality suffix on every
          // subsequent resume (title → "Series – Quality – Quality" → …).
          series_name: isSeries ? entry.title : undefined,
          series_name_alt: isSeries ? (entry.name || entry.title) : undefined,

          screenshot_uri: entry.screenshot_uri,

          is_series: 0,
          is_season: 0,
          is_episode: isSeries ? 1 : 0,
          is_playable_movie: !isSeries,
          is_continue_watching: true,
          cmd: entry.cmd,
          series_number: entry.series_number,
          progressPercent: entry.progressPercent,
          catalogId: entry.catalogId,

          playbackFileId: (entry as any).playbackFileId || entry.itemId || entry.mediaId,

          cw_content_type: entry.type,
          cw_category_id: (entry as any).categoryId || null,

          cw_episode_card_id: (entry as any).episodeCardId || entry.itemId || null,
        } as any);
        addedIds.add(displayId.toString());
      } catch (err) {
        console.error(`Failed to parse CW entry for record`, record, err);
      }
    }
    return items;
  }, [progressRecords]);

  const handleDismiss = useCallback(
    async (e: React.MouseEvent, targetId: string) => {
      e.stopPropagation();
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
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 md:gap-6 lg:grid-cols-6 xl:grid-cols-7">
        {inProgressItems.map((item, index) => (
          <div key={`${item.id}-${index}`} className="group relative">
            <button
              className="absolute right-1 top-1 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity duration-200 hover:bg-red-600 focus:opacity-100 group-hover:opacity-100"
              style={{ lineHeight: 1 }}
              onClick={(e) => handleDismiss(e, item.id)}
              title="Remove from Continue Watching"
              aria-label="Remove"
              data-focusable="true"
            >
              ×
            </button>
            <MediaCard
              item={item}
              onClick={onClick}
              progressPercent={item.progressPercent}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContinueWatching;
