import type { MediaItem, ChannelGroup } from '@/types';

export type { MediaItem, ChannelGroup };

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  total_items: number;
  isPortal?: boolean;
}
