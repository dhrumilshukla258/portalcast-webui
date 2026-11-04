import { getBaseUrl } from '@/api/config';

export interface OnlineSubtitleRef {
  fileId: number;
  downloadId?: string;
}

/** The address of an online subtitle (the server's download, as WebVTT). */
export function subtitleDownloadUrl(result: OnlineSubtitleRef): string {
  const hostPart = getBaseUrl().replace('/api', '');
  // New servers read `id` (OpenSubtitles or SubDL); older ones only `fileId`.
  const id = result.downloadId || `os:${result.fileId}`;
  const query = new URLSearchParams({ id });
  if (result.fileId) query.set('fileId', String(result.fileId));
  return `${hostPart}/api/v2/subtitles/download?${query.toString()}`;
}

/**
 * Whether the subtitle can be downloaded. "Best match" tries the next result when the top one
 * cannot (owner 2026-11-04: OpenSubtitles' downloads failed and the added track stayed empty).
 * A working download is stored by the server, so the player's own request is answered from it.
 */
export async function subtitleDownloads(result: OnlineSubtitleRef): Promise<boolean> {
  try {
    const res = await fetch(subtitleDownloadUrl(result), { credentials: 'include' });
    return res.ok;
  } catch {
    return false;
  }
}
