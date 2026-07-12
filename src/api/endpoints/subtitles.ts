import { BASE_URL } from '@/api/config';
import { authFetch } from '@/api/client';
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
    `${BASE_URL}/media/info?url=${b64url}&t=${streamToken}`
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
    `${BASE_URL}/v2/subtitles/search?${params.toString()}`
  );
  return response.json();
};
