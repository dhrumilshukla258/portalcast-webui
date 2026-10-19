import type { EPG_List } from '@/types';
import type { ApiResponse } from '@/api/client';

export type { EPG_List };

export type EPGResponse = ApiResponse<{
  timestamp: number;
  data: Record<string, EPG_List[]>;
}>;

/** `/v2/epg/window`: hour-aligned [windowStart, windowEnd) in unix seconds; channels with no
 * programme in the window are absent from `data`. `timestamp` is null when the server has no
 * guide yet. */
export interface EPGWindowBody {
  timestamp: string | null;
  windowStart: number;
  windowEnd: number;
  data: Record<string, EPG_List[]>;
}
