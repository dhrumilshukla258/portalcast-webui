/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { URL_PATHS } from '@/api/config';
import { getDownloadLink } from '@/api/endpoints/downloads';

interface UseDownloadActionsArgs {
  item?: any;
  itemId?: string | null;
  rawStreamUrl?: string | null;
  contentType: 'movie' | 'series' | 'tv';
  seriesItem?: any;
}

export function useDownloadActions({
  item,
  itemId,
  rawStreamUrl,
  contentType,
  seriesItem,
}: UseDownloadActionsArgs) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(async () => {
    if (rawStreamUrl) {
      try {
        await navigator.clipboard.writeText(rawStreamUrl);
      } catch {
        const tempInput = document.createElement('textarea');
        tempInput.value = rawStreamUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [rawStreamUrl]);

  const handleDownload = useCallback(async () => {
    if (!item && !itemId) return;
    try {
      const isSeries = contentType === 'series' || item?.is_episode ? '1' : '0';
      const cmdSource = item?.cmd || rawStreamUrl || '';

      let seriesVal = '';
      if (item?.series_number !== undefined) {
        seriesVal = String(item.series_number);
      } else if (item?.is_episode) {
        seriesVal = '1';
      }

      const targetId = item?.id ?? itemId;

      // For an episode, name the file "<Series> S<season>E<episode>" instead of just the
      // episode's own (often generic) title — for a movie, just the movie's title.
      let title = '';
      if (item?.is_episode) {
        const seriesName = seriesItem?.name || seriesItem?.title || '';
        const seasonNum = item?.series_number;
        const epNum = item?.episode_num;
        if (seriesName && seasonNum !== undefined && epNum !== undefined) {
          const pad = (n: number) => String(n).padStart(2, '0');
          title = `${seriesName} S${pad(Number(seasonNum))}E${pad(Number(epNum))}`;
        } else {
          title = seriesName || item?.title || item?.name || '';
        }
      } else {
        title = item?.title || item?.name || '';
      }

      // The download itself is opened via a plain `window.open` navigation,
      // which can't carry a Bearer header — so mint a short-lived, server-side
      // token bound to this exact target first (authenticated, via the JWT
      // the `api` client attaches), then open the tokenized URL it returns.
      const { url } = await getDownloadLink({
        id: targetId,
        isSeries,
        series: seriesVal || undefined,
        cmd: cmdSource || undefined,
        title: title || undefined,
      });
      const baseUrl = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
      window.open(`${baseUrl}${url}`, '_blank');
      toast.success('Download started!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to start download');
    }
  }, [item, itemId, rawStreamUrl, contentType, seriesItem]);

  return { copied, handleCopyLink, handleDownload };
}
