import { api, authFetch } from '@/api/client';
import { getBaseUrl } from '@/api/config';
import { API_PATHS } from '@/api/endpoints/channels';
import type { EPGResponse, EPGWindowBody } from '@/api/types/epg';

/** Whole guide (~50 MB of JSON on a big portal). Prefer getEPGWindow. */
export const getEPG = async (): Promise<EPGResponse> =>
  await api.get(API_PATHS.EPG);

export type EPGWindowResult =
  | { status: 'ok'; etag: string | null; body: EPGWindowBody }
  | { status: 'not-modified' }
  | { status: 'unsupported' };

/**
 * `GET /v2/epg/window?hours=` — only the programmes overlapping the next `hours` (server
 * default 6). Sends `If-None-Match` when `etag` is given; a 304 comes back as
 * `not-modified` (keep the data you have). `unsupported` = 404 from a server older than this
 * endpoint: fall back to getEPG().
 */
export const getEPGWindow = async (hours = 6, etag?: string | null): Promise<EPGWindowResult> => {
  const path = `${getBaseUrl()}${API_PATHS.EPG_WINDOW}?hours=${hours}`;
  const url = path.startsWith('http') ? path : new URL(path, window.location.origin).toString();
  const res = await authFetch(url, { headers: etag ? { 'If-None-Match': etag } : undefined });
  if (res.status === 304) return { status: 'not-modified' };
  if (res.status === 404) return { status: 'unsupported' };
  if (!res.ok) throw new Error(`EPG window request failed: ${res.status}`);
  return { status: 'ok', etag: res.headers.get('ETag'), body: (await res.json()) as EPGWindowBody };
};

export const getExpiry = async (): Promise<{
  success: boolean;
  expiry: string | null;
}> =>
  (await api.get<{ success: boolean; expiry: string | null }>(API_PATHS.EXPIRY))
    .data;
