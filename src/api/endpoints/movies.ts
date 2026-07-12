/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '@/api/client';
import { API_PATHS } from '@/api/endpoints/channels';
import type { MediaItem, ChannelGroup, PaginatedResponse } from '@/api/types/channels';

export const getMedia = async (
  params: Record<string, any>,
  signal?: AbortSignal
): Promise<PaginatedResponse<MediaItem>> => {
  const response = (
    await api.get<PaginatedResponse<MediaItem>>(API_PATHS.MOVIES, {
      params,
      signal,
    })
  ).data;
  if (!response) {
    throw new Error('No response data received from media API.');
  }

  return response;
};

export const getMovieCategories = async (
  signal?: AbortSignal
): Promise<PaginatedResponse<ChannelGroup>> => {
  const response = (
    await api.get<any>(API_PATHS.MOVIE_GROUPS, {
      signal,
    })
  ).data;
  if (!response) {
    throw new Error('No response data received from movie groups API.');
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

export const getMovieUrl = async (params: Record<string, any> = {}) =>
  (await api.get(API_PATHS.MOVIE_LINK, { params })).data;
