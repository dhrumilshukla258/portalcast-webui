/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getBaseUrl } from '@/api/config';
import { probeStreamSubtitles, searchOnlineSubtitles as apiSearchOnlineSubtitles } from '@/api/endpoints/subtitles';

// Owns subtitle track discovery (embedded-track probing for progressive VOD,
// online search, and manual add) — extracted from VideoContext.tsx.
/** What a viewer can change in the subtitle search (Settings › Captions › Add). */
export interface SubtitleQuery {
  title?: string;
  year?: string;
  season?: string;
  episode?: string;
  language?: string;
}

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

    // A library file (folder or Jellyfin) is asked even when it plays as HLS (the browser
    // fallback): the server knows its tracks and the subtitle files beside it.
    // `lib=1`: a Jellyfin file played straight from Jellyfin (it still carries this server's token).
    const isLibrary = streamUrl.includes('/api/local/') || /[?&]lib=1(&|$)/.test(streamUrl);
    if (!isProgressive && !isLibrary) {
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
        const hostPart = getBaseUrl().replace("/api", "");
        // The file's own subtitle files first (Jellyfin's external subtitles, a folder's
        // .srt; servers from 2026-10-29), then the ones inside the video.
        const external = (Array.isArray(data.external) ? data.external : []).map((sub: any, idx: number) => ({
          src: `${hostPart}${sub.url}`,
          label: sub.label || sub.language || `Subtitle ${idx + 1}`,
          srclang: sub.language || 'und',
          id: `ext_${idx}`,
        }));
        const embedded = (Array.isArray(data.subtitles) ? data.subtitles : []).map((sub: any, idx: number) => ({
          src: `${hostPart}/api/media/subtitle?url=${b64url}&track=${sub.index}&t=${streamToken}`,
          label: sub.title || sub.language || `Track ${idx + 1}`,
          srclang: sub.language || 'und',
          id: sub.index,
        }));
        setSubtitles([...external, ...embedded]);
      } catch (err) {
        console.error("Failed to fetch subtitles:", err);
      }
    };

    fetchSubtitles();
  }, [streamUrl, rawStreamUrl, contentType]);

  // A language code (older callers), or what the viewer typed in the search form: anything
  // left out is taken from the title playing.
  const searchOnlineSubtitles = useCallback(async (query?: string | SubtitleQuery): Promise<any[]> => {
    const q: SubtitleQuery = typeof query === 'string' ? { language: query } : (query ?? {});
    const seriesName = seriesItem?.name || seriesItem?.title || '';
    const title = (q.title ?? '').trim() || (item?.is_episode ? (seriesName || item?.title || item?.name || '') : (item?.title || item?.name || ''));
    if (!title) return [];
    const year = q.year ?? (item?.year ? String(item.year) : '');
    const season = q.season ?? (item?.is_episode && item?.series_number !== undefined ? String(item.series_number) : '');
    const episode = q.episode ?? (item?.is_episode && item?.episode_num !== undefined ? String(item.episode_num) : '');

    setSubtitleSearchLoading(true);
    try {
      const params = new URLSearchParams({ title: title.slice(0, 200) });
      if (/^\d{1,4}$/.test(year)) params.set('year', year);
      if (/^\d{1,4}$/.test(season)) params.set('season', season);
      if (/^\d{1,4}$/.test(episode)) params.set('episode', episode);
      if (q.language) params.set('lang', q.language);
      // What is playing: the server hashes the file (exact matches first) and, for a
      // Jellyfin title, also asks Jellyfin's subtitle search.
      const playingToken = streamUrl ? new URL(streamUrl, window.location.origin).searchParams.get('t') : null;
      if (playingToken) params.set('t', playingToken);

      const data = await apiSearchOnlineSubtitles(params);
      setOnlineSubtitleResults(data?.results || []);
      if (!data?.results?.length) toast.info('No subtitles found.');
      return data?.results || [];
    } catch (err) {
      console.error('Subtitle search failed:', err);
      toast.error('Subtitle search failed.');
      return [];
    } finally {
      setSubtitleSearchLoading(false);
    }
  }, [item, seriesItem, streamUrl]);

  const addOnlineSubtitle = useCallback((result: { fileId: number; downloadId?: string; language: string; releaseName: string }) => {
    const hostPart = getBaseUrl().replace('/api', '');
    // New servers read `id` (OpenSubtitles or SubDL); older ones only `fileId`.
    const id = result.downloadId || `os:${result.fileId}`;
    const query = new URLSearchParams({ id });
    if (result.fileId) query.set('fileId', String(result.fileId));
    const track = {
      src: `${hostPart}/api/v2/subtitles/download?${query.toString()}`,
      label: `${result.language?.toUpperCase() || 'Subtitle'} — ${result.releaseName}`,
      srclang: result.language || 'und',
      id: `sub_${id}`,
    };
    setSubtitles((prev) => [...prev.filter((t) => t.id !== track.id), track]);
    setOnlineSubtitleResults([]);
    toast.success('Subtitle added — select it from the Subtitles menu.');
    return track.label;
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
