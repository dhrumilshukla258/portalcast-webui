import type { MediaItem } from '@/types';
import type { ProgressRecord } from '@/api/types/user';

/**
 * The episode a series' progress row points at, among `episodes` — by its playback ids,
 * then by its title. Same rule as the TV app's SeriesProgress.findEpisode.
 */
export function findResumeEpisode(record: ProgressRecord | null | undefined, episodes: MediaItem[]): MediaItem | null {
  const meta = record?.meta;
  if (!meta) return null;
  const ids = new Set([meta.id, meta.itemId, meta.playbackFileId].filter((v) => v != null && String(v).trim()).map(String));
  const byId = episodes.find((ep) => ids.has(String(ep.id)));
  if (byId) return byId;
  const title = String(meta.episodeTitle || '').trim().toLowerCase();
  if (!title) return null;
  return episodes.find((ep) => String(ep.title || ep.name || '').trim().toLowerCase() === title) ?? null;
}

/** For pages without the series' own row: the most recently watched unfinished episode. */
export function latestUnfinished(records: ProgressRecord[], episodes: MediaItem[]): MediaItem | null {
  const byId = new Map(episodes.map((ep) => [String(ep.id), ep]));
  let best: { ep: MediaItem; at: number } | null = null;
  for (const r of records) {
    const ep = byId.get(String(r.mediaId));
    if (!ep || r.completed) continue;
    const at = Date.parse(r.updatedAt || '') || Number(r.meta?.timestamp) || 0;
    if (!best || at > best.at) best = { ep, at };
  }
  return best?.ep ?? null;
}
