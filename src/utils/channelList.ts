import type { MediaItem } from '@/types';
import { getChannels, API_PATHS } from '@/api/endpoints/channels';
import { ANSWERS_UPDATED } from '@/api/responseCache';

// The whole channel list, fetched once per page load and shared by Search (channel results)
// and Sports (names of the channels a game is on). A failed fetch is retried next time.
let channelCache: Promise<MediaItem[]> | null = null;

// A changed list arrived after the stored one was shown: the next ask takes the fresh one.
if (typeof window !== 'undefined') {
  window.addEventListener(ANSWERS_UPDATED, (e) => {
    if (String((e as CustomEvent<{ path?: string }>).detail?.path ?? '').startsWith(API_PATHS.CHANNELS)) channelCache = null;
  });
}

export function allChannels(): Promise<MediaItem[]> {
  if (!channelCache) {
    channelCache = getChannels().then((r) => r.data).catch((e) => { channelCache = null; throw e; });
  }
  return channelCache;
}
