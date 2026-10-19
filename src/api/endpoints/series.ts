/* eslint-disable @typescript-eslint/no-explicit-any */
import { cachedGet } from '@/api/responseCache';
import { api } from '@/api/client';
import { API_PATHS } from '@/api/endpoints/channels';
import type { MediaItem, ChannelGroup, PaginatedResponse } from '@/api/types/channels';

export const getSeries = async (
  params: Record<string, any>,
  signal?: AbortSignal
): Promise<PaginatedResponse<MediaItem>> => {
  // Series lists, seasons and episode lists are cached; an episodeId lookup is never.
  const response = params?.episodeId
    ? (await api.get<PaginatedResponse<MediaItem>>(API_PATHS.SERIES, { params, signal })).data
    : await cachedGet<PaginatedResponse<MediaItem>>(API_PATHS.SERIES, { params, signal });
  if (!response) {
    throw new Error('No response data received from series API.');
  }

  return response;
};

export const getSeriesCategories = async (
  signal?: AbortSignal
): Promise<PaginatedResponse<ChannelGroup>> => {
  const response = (
    await cachedGet<any>(API_PATHS.SERIES_GROUPS, {
      signal,
    })
  );
  if (!response) {
    throw new Error('No response data received from series groups API.');
  }
  const rawData = response.data || response;
  const groupsList = Array.isArray(rawData) ? rawData : [];
  return {
    data: groupsList.map((g: any) => ({
      id: String(g.id),
      title: String(g.title || g.name || ''),
    })),
    page: 1,
    total_items: groupsList.length,
  };
};
