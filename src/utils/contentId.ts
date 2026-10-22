import type { MediaItem } from '@/types';

const CONTENT_ID = /^(movie|series)_[A-Za-z0-9:_-]+$/;

/**
 * The catalog id of a card ("movie_123", "series_456"): Discover cards carry it as their id,
 * portal list items and Continue Watching entries as `catalogId`; else built from the type and
 * the raw id. Null when it cannot be known.
 */
export function contentIdOf(item: MediaItem): string | null {
  const anyItem = item as unknown as Record<string, unknown>;
  const catalogId = typeof anyItem.catalogId === 'string' ? anyItem.catalogId : '';
  if (CONTENT_ID.test(catalogId)) return catalogId;
  const id = String(item.id ?? '');
  if (CONTENT_ID.test(id)) return id;
  if (!id) return null;
  const series = Number(anyItem.is_series) === 1 || anyItem.type === 'series';
  return `${series ? 'series' : 'movie'}_${id}`;
}
