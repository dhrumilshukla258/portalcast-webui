/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MediaItem } from '@/types';
import type { ProgressRecord } from '@/api/types/user';
import { timeLeft } from '@/utils/titleFormat';

export interface ProgressEntry {
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

/**
 * Continue Watching cards from the viewer's progress records, newest first: unfinished,
 * not live TV, one card per title. Shared by the row and the Home hero.
 */
export function continueItemsOf(progressRecords: ProgressRecord[]): MediaItem[] {
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

        // The wide card (design-system.md): the title's backdrop from the server, and
        // "Episode title · 23 min left" under the title.
        cw_backdrop: (record as any).backdrop_path || undefined,
        cw_show_title: entry.title,
        cw_detail: [isSeries ? entry.episodeTitle : undefined, timeLeft(entry.duration - entry.currentTime)]
          .filter(Boolean).join(' · ') || undefined,
      } as any);
      addedIds.add(displayId.toString());
    } catch (err) {
      console.error(`Failed to parse CW entry for record`, record, err);
    }
  }
  return items;
}
