/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '@/api/client';
import type { DownloadLinkResponse } from '@/api/types/downloads';

export const getDownloadLink = async (
  params: Record<string, any> = {}
): Promise<DownloadLinkResponse> =>
  (await api.get<DownloadLinkResponse>('/v2/download-link', { params })).data;

