import { api } from '@/api/client';

export interface MediaInfoReport {
  itemType: 'movie' | 'episode';
  itemId: string;
  width: number;
  height: number;
  fps?: number | null;
  codec?: string | null;
}

/** Report what the player decoded (servers from 2026-10-19; older ones 404, ignored). */
export const reportMediaInfo = async (body: MediaInfoReport): Promise<void> => {
  await api.post('/v2/media-info', body).catch(() => undefined);
};
