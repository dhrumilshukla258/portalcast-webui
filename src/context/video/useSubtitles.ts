/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { BASE_URL } from '@/api/config';
import { probeStreamSubtitles, searchOnlineSubtitles as apiSearchOnlineSubtitles } from '@/api/endpoints/subtitles';

// Owns subtitle track discovery (embedded-track probing for progressive VOD,
// online search, and manual add) — extracted from VideoContext.tsx.
export function useSubtitles(
  streamUrl: string | null | undefined,
  rawStreamUrl: string | null | undefined,
  contentType: 'movie' | 'series' | 'tv',
  item: any,
  seriesItem: any
) {
  const [subtitles, setSubtitles] = useState<any[]>([]);
  const [onlineSubtitleResults, setOnlineSubtitleResults] = useState<any[]>([]);
  const [subtitleSearchLoading, setSubtitleSearchLoading] = useState(false);

  useEffect(() => {
    if (!streamUrl || contentType === 'tv') {
      setSubtitles([]);
      return;
    }

    // Extension-sniffing the URL doesn't work anymore — stream URLs are opaque
    // tokens (`/api/vod/play?t=...`), never a real file extension. Use the
    // same signal the player itself uses to pick HLS vs progressive playback
    // (see VideoPlayerContent.tsx's isM3u8 check): the `&m3u8=1` tag that
    // proxyUrlFor() appends server-side when the underlying resource is HLS.
    // Absence of that tag means progressive — the only case embedded
    // subtitles are even possible to extract from (HLS segments aren't a
    // single seekable file `ffprobe` can inspect for muxed tracks).
    const isProgressive = !(
      (rawStreamUrl && rawStreamUrl.toLowerCase().includes('m3u8')) ||
      streamUrl.toLowerCase().includes('m3u8')
    );

    if (!isProgressive) {
      setSubtitles([]);
      return;
    }

    const fetchSubtitles = async () => {
      try {
        // The active stream's own token proves identity to the subtitle
        // probe/extract endpoints — they can't require a Bearer header
        // (the <track> element can't attach one), so they reuse whatever
        // token is already minted for this playback session.
        const streamToken = new URL(streamUrl!, window.location.origin).searchParams.get('t');
        if (!streamToken) return;

        const b64url = btoa(rawStreamUrl!);
        const data = await probeStreamSubtitles(rawStreamUrl!, streamToken);
        if (!data) return;
        if (data.subtitles && Array.isArray(data.subtitles)) {
          const mapped = data.subtitles.map((sub: any, idx: number) => {
            const hostPart = BASE_URL.replace("/api", "");
            return {
              src: `${hostPart}/api/media/subtitle?url=${b64url}&track=${sub.index}&t=${streamToken}`,
              label: sub.title || sub.language || `Track ${idx + 1}`,
              srclang: sub.language || 'und',
              id: sub.index,
            };
          });
          setSubtitles(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch subtitles:", err);
      }
    };

    fetchSubtitles();
  }, [streamUrl, rawStreamUrl, contentType]);

  const searchOnlineSubtitles = useCallback(async (language?: string) => {
    const seriesName = seriesItem?.name || seriesItem?.title || '';
    const title = item?.is_episode ? (seriesName || item?.title || item?.name || '') : (item?.title || item?.name || '');
    if (!title) return;

    setSubtitleSearchLoading(true);
    try {
      const params = new URLSearchParams({ title });
      if (item?.year) params.set('year', String(item.year));
      if (item?.is_episode && item?.series_number !== undefined) params.set('season', String(item.series_number));
      if (item?.is_episode && item?.episode_num !== undefined) params.set('episode', String(item.episode_num));
      if (language) params.set('lang', language);

      const data = await apiSearchOnlineSubtitles(params);
      setOnlineSubtitleResults(data?.results || []);
      if (!data?.results?.length) toast.info('No subtitles found.');
    } catch (err) {
      console.error('Subtitle search failed:', err);
      toast.error('Subtitle search failed.');
    } finally {
      setSubtitleSearchLoading(false);
    }
  }, [item, seriesItem]);

  const addOnlineSubtitle = useCallback((result: { fileId: number; language: string; releaseName: string }) => {
    const hostPart = BASE_URL.replace('/api', '');
    const track = {
      src: `${hostPart}/api/v2/subtitles/download?fileId=${result.fileId}`,
      label: `${result.language?.toUpperCase() || 'Subtitle'} — ${result.releaseName}`,
      srclang: result.language || 'und',
      id: `os_${result.fileId}`,
    };
    setSubtitles((prev) => [...prev.filter((t) => t.id !== track.id), track]);
    setOnlineSubtitleResults([]);
    toast.success('Subtitle added — select it from the Subtitles menu.');
  }, []);

  const clearSubtitleSearch = useCallback(() => {
    setOnlineSubtitleResults([]);
  }, []);

  const addLocalSubtitleFile = useCallback(async (file: File) => {
    try {
      const raw = await file.text();
      const isSrt = /\.srt$/i.test(file.name) || !/^WEBVTT/.test(raw.trim());
      // Same conversion the server does for OpenSubtitles results — SRT uses "," for
      // milliseconds, WebVTT (the only format the native <track> element understands) uses ".".
      const vtt = isSrt
        ? `WEBVTT\n\n${raw.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')}`
        : raw;

      const blob = new Blob([vtt], { type: 'text/vtt' });
      const src = URL.createObjectURL(blob);
      const track = {
        src,
        label: file.name.replace(/\.(srt|vtt)$/i, ''),
        srclang: 'und',
        id: `local_${file.name}_${file.size}`,
      };
      setSubtitles((prev) => [...prev.filter((t) => t.id !== track.id), track]);
      toast.success('Subtitle loaded — select it from the Subtitles menu.');
    } catch (err) {
      console.error('Failed to load local subtitle:', err);
      toast.error('Failed to load subtitle file.');
    }
  }, []);

  return {
    subtitles,
    onlineSubtitleResults,
    subtitleSearchLoading,
    searchOnlineSubtitles,
    addOnlineSubtitle,
    addLocalSubtitleFile,
    clearSubtitleSearch,
  };
}
