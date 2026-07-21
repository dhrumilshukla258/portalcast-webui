/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { URL_PATHS } from '@/api/config';

// Owns the "cast to device" action — extracted from VideoContext.tsx.
export function useCasting(
  playerRef: React.RefObject<any>,
  item: any,
  previewChannelInfo: any,
  channelInfo: any,
  streamUrl: string | null | undefined,
  rawStreamUrl: string | null | undefined,
  contentType: 'movie' | 'series' | 'tv',
  castTo: ((deviceId: string, media: any, state: any) => void) | undefined,
  setIsSettingsMenuOpen: (v: boolean) => void
) {
  const handleCast = useCallback(
    (deviceId: string) => {
      if (!item && !previewChannelInfo && !channelInfo) return;
      const baseUrl = URL_PATHS.HOST || window.location.origin;
      const formatUrl = (url?: string | null) =>
        url?.startsWith('http')
          ? url
          : url
            ? `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
            : undefined;

      if (castTo) {
        castTo(
          deviceId,
          {
            media: item || previewChannelInfo || channelInfo,
            streamUrl: formatUrl(streamUrl),
            rawStreamUrl: formatUrl(rawStreamUrl),
            contentType,
          },
          {
            currentTime: playerRef.current?.currentTime || 0,
            volume: playerRef.current?.volume || 1,
            muted: playerRef.current?.muted || false,
          }
        );
      }
      toast.success('Casting started...');
      setIsSettingsMenuOpen(false);
    },
    [
      item,
      previewChannelInfo,
      channelInfo,
      streamUrl,
      rawStreamUrl,
      castTo,
      contentType,
      playerRef,
      setIsSettingsMenuOpen,
    ]
  );

  return { handleCast };
}
