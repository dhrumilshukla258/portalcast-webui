import type { MediaItem } from '@/types';
import { getChannels } from '@/api/endpoints/channels';

// The whole channel list, fetched once per page load and shared by Search (channel results)
// and Sports (names of the channels a game is on). A failed fetch is retried next time.
let channelCache: Promise<MediaItem[]> | null = null;

export function allChannels(): Promise<MediaItem[]> {
  if (!channelCache) {
    channelCache = getChannels().then((r) => r.data).catch((e) => { channelCache = null; throw e; });
  }
  return channelCache;
}
