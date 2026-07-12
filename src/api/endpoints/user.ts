/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '@/api/client';
import type { ProgressRecord } from '@/api/types/user';

export const getUserProgress = async (): Promise<ProgressRecord[]> => {
  const response = await api.get<ProgressRecord[]>('/user/progress');
  return response.data || [];
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
  return response.data;
};

export const deleteUserProgress = async (
  mediaId: string
): Promise<{ success: boolean }> => {
  const response = await api.delete<{ success: boolean }>(`/user/progress/${encodeURIComponent(mediaId)}`);
  return response.data;
};

export const clearUserProgress = async (): Promise<{ success: boolean }> => {
  const response = await api.post<{ success: boolean }>('/user/clear-history');
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
