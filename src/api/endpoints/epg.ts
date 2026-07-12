import { api } from '@/api/client';
import { API_PATHS } from '@/api/endpoints/channels';
import type { EPGResponse } from '@/api/types/epg';

export const getEPG = async (): Promise<EPGResponse> =>
  await api.get(API_PATHS.EPG);

export const getExpiry = async (): Promise<{
  success: boolean;
  expiry: string | null;
}> =>
  (await api.get<{ success: boolean; expiry: string | null }>(API_PATHS.EXPIRY))
    .data;
