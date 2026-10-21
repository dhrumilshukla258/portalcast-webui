/* eslint-disable @typescript-eslint/no-explicit-any */
import { getMovieUrl } from '@/api/endpoints/movies';
import type { MediaItem } from '@/types';

// The backend always hands back a URL that's already routed through our own
// server behind an opaque token (/live.m3u8?t=..., /api/proxy?t=...) — never
// a raw upstream address, so there's nothing left for the client to wrap.
//
// NOTE: there used to be a shortcut here (`if (!isPortal && item.cmd) return
// item.cmd directly`) for Xtream-provider setups. That's unsafe now: for
// episode/movie *files* (unlike already-tokenized live channels via
// mapChannel), item.cmd from the listing API is the raw, untokenized
// upstream URL — using it directly bypasses the backend entirely, which is
// both a security leak (raw portal URL, sometimes with embedded admin
// credentials, handed to the browser) and why playback failed outright
// (browsers can't play a random external CDN URL directly — CORS/host
// issues). Always resolve through the backend, which tokenizes uniformly
// for both provider types.
export async function resolveStreamUrl(
  item: MediaItem,
  seriesNumber?: number,
  displayOverride?: { title?: string; category?: string },
  // Broken-stream tracking (server docs/skill-stream-failures.md): the LIST
  // item id the user browsed (not the resolved file's id) + its type, so a
  // movie that keeps failing gets hidden under the right key. Optional — the
  // server falls back to the file id when absent.
  identity?: { itemId?: string | number; itemType?: 'movie' | 'episode' }
): Promise<{ raw: string; proxied: string }> {
  // client=web: local files a browser cannot play come back as an HLS fallback (server
  // content/library/remux.ts); IPTV links are unaffected.
  const urlParams: Record<string, any> = { id: item.id, client: 'web' };

  if (seriesNumber !== undefined) {
    urlParams.series = seriesNumber;
  }

  // Purely for the admin "active streams" view — lets it show a real title
  // and category instead of an opaque resource key. `item` here is sometimes
  // a resolved *file/quality variant* (e.g. "Hindi / Excellent quality
  // (1080)"), not the actual episode/movie metadata, so callers that know
  // the real title (e.g. combining series + episode name) should pass it via
  // displayOverride rather than relying on item.title/item.name.
  const displayTitle = displayOverride?.title || item.title || item.name;
  if (displayTitle) urlParams.title = displayTitle;
  const displayCategory = displayOverride?.category || item.genres_str || item.tv_genre_id || item.category_id;
  if (displayCategory) urlParams.category = String(displayCategory);

  if (identity?.itemId !== undefined && identity.itemId !== '') {
    urlParams.itemId = String(identity.itemId);
    if (identity.itemType) urlParams.itemType = identity.itemType;
  }

  const linkData = (await getMovieUrl(urlParams)) as Record<string, any>;
  const raw = linkData?.js?.cmd || linkData?.cmd;
  if (typeof raw !== 'string') throw new Error('Stream URL not found.');
  return { raw, proxied: raw };
}
