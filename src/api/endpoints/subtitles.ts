import { getBaseUrl } from '@/api/config';
import { api, authFetch } from '@/api/client';
import type {
  SubtitleProbeResponse,
  OnlineSubtitleSearchResponse,
} from '@/api/types/subtitles';

/**
 * Probes a stream for embedded subtitle tracks. The stream's own short-lived
 * token (`t` query param, already embedded in the caller's stream URL) is
 * what authenticates this request server-side — it's passed through
 * verbatim, same as before. Routed through `authFetch` (adds bearer-token +
 * 401-refresh handling that the previous raw `fetch()` call never had — see
 * VideoContext.tsx migration notes).
 */
export const probeStreamSubtitles = async (
  rawStreamUrl: string,
  streamToken: string
): Promise<SubtitleProbeResponse | null> => {
  const b64url = btoa(rawStreamUrl);
  const response = await authFetch(
    `${getBaseUrl()}/media/info?url=${b64url}&t=${streamToken}`
  );
  if (!response.ok) return null;
  return response.json();
};

/**
 * Searches OpenSubtitles for a title. Routed through `authFetch` — same
 * behavior-adjacent note as `probeStreamSubtitles` above.
 */
export const searchOnlineSubtitles = async (
  params: URLSearchParams
): Promise<OnlineSubtitleSearchResponse> => {
  const response = await authFetch(
    `${getBaseUrl()}/v2/subtitles/search?${params.toString()}`
  );
  return response.json();
};

export interface SubtitleKeptReport {
  /** The download id ("gd:…", "os:…"). */
  id: string;
  lang: string;
  delayMs: number;
  label?: string | null;
}

/**
 * An online subtitle kept on while watching (utils/subtitleKept.ts). `t` is the playing stream's
 * token: the server takes the movie or episode from it. Servers from 2026-11-04; older ones 404.
 */
export const reportSubtitleKept = async (t: string, body: SubtitleKeptReport): Promise<void> => {
  await api.post(`/v2/subtitles/kept?t=${encodeURIComponent(t)}`, body).catch(() => undefined);
};
