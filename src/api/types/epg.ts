import type { EPG_List } from '@/types';
import type { ApiResponse } from '@/api/client';

export type { EPG_List };

export type EPGResponse = ApiResponse<{
  timestamp: number;
  data: Record<string, EPG_List[]>;
}>;
