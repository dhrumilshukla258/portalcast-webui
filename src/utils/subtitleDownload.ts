import { getBaseUrl } from '@/api/config';
import { authFetch } from '@/api/client';

export interface OnlineSubtitleRef {
  fileId: number;
  downloadId?: string;
  source?: string;
}

/** What a pick that did not download says (the same words as the TV app). */
export function subtitleFailureText(result: OnlineSubtitleRef): string {
  return result.source === 'opensubtitles' || (!result.downloadId && result.fileId)
    ? "OpenSubtitles didn't send that file. Try another one."
    : "That subtitle didn't load. Try another one.";
}

/** The address of an online subtitle (the server's download, as WebVTT). */
export function subtitleDownloadUrl(result: OnlineSubtitleRef): string {
  // New servers read `id` (OpenSubtitles or SubDL); older ones only `fileId`.
  const id = result.downloadId || `os:${result.fileId}`;
  const query = new URLSearchParams({ id });
  if (result.fileId) query.set('fileId', String(result.fileId));
  return `${getBaseUrl()}/v2/subtitles/download?${query.toString()}`;
}

/**
 * Whether the subtitle can be downloaded. "Best match" tries the next result when the top one
 * cannot (owner 2026-11-04: OpenSubtitles' downloads failed and the added track stayed empty).
 * A working download is stored by the server, so the player's own request is answered from it.
 */
export async function subtitleDownloads(result: OnlineSubtitleRef): Promise<boolean> {
  try {
    // The search and download must use the same viewer's linked subtitle account.
    const res = await authFetch(subtitleDownloadUrl(result));
    return res.ok;
  } catch {
    return false;
  }
}
