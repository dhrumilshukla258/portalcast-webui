/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '@/api/client';
import type { ProgressRecord } from '@/api/types/user';

// getUserProgress() is called independently from several unrelated places
// (media library mount, Continue Watching load, video playback resume,
// "play continue-watching" click) with no shared cache — opening the app and
// starting a video could fire 3+ near-simultaneous full-progress-list
// fetches for the same data. De-duping in-flight requests and caching the
// result briefly fixes that at the source without every caller needing to
// coordinate. The TTL is short specifically because progress changes during
// playback (saveUserProgress) — this must never serve a resume position
// that's more than a few seconds stale.
const PROGRESS_CACHE_TTL_MS = 4000;
let progressCache: { data: ProgressRecord[]; timestamp: number } | null = null;
let progressInFlight: Promise<ProgressRecord[]> | null = null;

function invalidateProgressCache() {
  progressCache = null;
}

export const getUserProgress = async (): Promise<ProgressRecord[]> => {
  if (progressInFlight) return progressInFlight;
  if (progressCache && Date.now() - progressCache.timestamp < PROGRESS_CACHE_TTL_MS) {
    return progressCache.data;
  }

  progressInFlight = (async () => {
    try {
      const response = await api.get<ProgressRecord[]>('/user/progress');
      const data = response.data || [];
      progressCache = { data, timestamp: Date.now() };
      return data;
    } finally {
      progressInFlight = null;
    }
  })();

  return progressInFlight;
};

export const saveUserProgress = async (
  mediaId: string,
  progress: number,
  completed: boolean,
  meta?: Record<string, any>
): Promise<{ success: boolean }> => {
  const response = await api.put<{ success: boolean }>('/user/progress', {
    mediaId,
    progress,
    completed,
    meta,
  });
  invalidateProgressCache();
  return response.data;
};

export const deleteUserProgress = async (
  mediaId: string
): Promise<{ success: boolean }> => {
  const response = await api.delete<{ success: boolean }>(`/user/progress/${encodeURIComponent(mediaId)}`);
  invalidateProgressCache();
  return response.data;
};

export const clearUserProgress = async (): Promise<{ success: boolean }> => {
  const response = await api.post<{ success: boolean }>('/user/clear-history');
  invalidateProgressCache();
  return response.data;
};

export interface OpenSubtitlesLinkStatus {
  linked: boolean;
  username: string | null;
}

export const getOpenSubtitlesStatus = async (): Promise<OpenSubtitlesLinkStatus> =>
  (await api.get<OpenSubtitlesLinkStatus>('/user/opensubtitles')).data;

export const linkOpenSubtitles = async (
  username: string,
  password: string
): Promise<void> => {
  await api.put('/user/opensubtitles', { username, password });
};

export const unlinkOpenSubtitles = async (): Promise<void> => {
  await api.delete('/user/opensubtitles');
};
