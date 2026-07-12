/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '@/api/client';
import type { MediaItem, ChannelGroup, PaginatedResponse } from '@/api/types/channels';

export const API_PATHS = {
  MOVIES: '/v2/movies',
  SERIES: '/v2/series',
  MOVIE_LINK: '/v2/movie-link',
  CHANNELS: '/v2/channels',
  CHANNEL_LINK: '/v2/channel-link',
  EPG: '/v2/epg',
  CHANNEL_GROUPS: '/v2/groups',
  EXPIRY: '/v2/expiry',
  CAROUSEL: '/carousel',
  MOVIE_GROUPS: '/v2/movie-groups',
  SERIES_GROUPS: '/v2/series-groups',
};

export const getChannels = async (
  signal?: AbortSignal
): Promise<PaginatedResponse<MediaItem>> => {
  const response = (await api.get<MediaItem[]>(API_PATHS.CHANNELS, { signal }))
    .data;
  if (!response || !Array.isArray(response)) {
    throw new Error('No response data received from channels API.');
  }

  return {
    data: response,
    page: 1,
    total_items: response.length,
  };
};

export const getChannelGroups = async (
  all: boolean = false,
  signal?: AbortSignal
): Promise<PaginatedResponse<ChannelGroup>> => {
  const params: Record<string, any> = {};
  if (all) {
    params.all = 'true';
  }

  const response = (
    await api.get<ChannelGroup[]>(API_PATHS.CHANNEL_GROUPS, { params, signal })
  ).data;
  if (!response || !Array.isArray(response)) {
    throw new Error('No response data received from channel groups API.');
  }

  return {
    data: response,
    page: 1,
    total_items: response.length,
  };
};

export const getChannelUrl = async (cmd: string) =>
  (await api.get(API_PATHS.CHANNEL_LINK, { params: { cmd } })).data;
