import { useEffect, useMemo, useRef, useState } from 'react';
import { useAnswersUpdated } from '@/hooks/useAnswersUpdated';
import { getSeries } from '@/api/endpoints/series';
import { findResumeEpisode } from '@/utils/resumeEpisode';
import type { MediaItem } from '@/types';
import type { ProgressRecord } from '@/api/types/user';

/**
 * A series page's seasons and episodes (the web page and the TV apps' page share it): the season
 * being watched is chosen first (else the first), its episodes load a page at a time, and the
 * episode being resumed is found (loading further pages, bounded) so the page can open on it.
 */
export function useSeasonEpisodes(seriesItem: MediaItem, seasons: MediaItem[], progressRecords: ProgressRecord[]) {
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [episodes, setEpisodes] = useState<MediaItem[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [loadingMoreEpisodes, setLoadingMoreEpisodes] = useState(false);
  const [episodePage, setEpisodePage] = useState(1);
  const [hasMoreEpisodes, setHasMoreEpisodes] = useState(false);
  // A stored copy of the episodes was shown and the server's differs: load them again.
  const episodesUpdated = useAnswersUpdated('/v2/series');
  const episodesUpdatedRef = useRef(0);

  // The series' own progress row: the episode the viewer is in the middle of.
  const continueRecord = useMemo(() => {
    const record = progressRecords.find((r) => String(r.mediaId) === String(seriesItem.id));
    return record && !record.completed ? record : null;
  }, [progressRecords, seriesItem.id]);

  // Open on the season being watched (else the first), rather than requiring a click
  // before any episodes show — the same as the TV app.
  useEffect(() => {
    if (selectedSeasonId || seasons.length === 0) return;
    const watching = continueRecord?.meta?.seasonId;
    const match = watching ? seasons.find((s) => String(s.id) === String(watching)) : undefined;
    setSelectedSeasonId((match ?? seasons[0]).id);
  }, [seasons, selectedSeasonId, continueRecord]);

  const category = seriesItem.category_id ? String(seriesItem.category_id) : '*';

  // Just the first page when a season is picked, so the opening episodes show at once; more
  // pages load on demand (loadMore).
  useEffect(() => {
    if (!selectedSeasonId) return;
    let cancelled = false;
    // A refresh (episodesUpdated) keeps the list on screen; a new season shows loading.
    const refreshing = episodesUpdatedRef.current !== episodesUpdated;
    episodesUpdatedRef.current = episodesUpdated;
    if (!refreshing) setLoadingEpisodes(true);
    setEpisodePage(1);
    getSeries({ movieId: seriesItem.id, seasonId: selectedSeasonId, page: 1, pageAtaTime: 1, category })
      .then((res) => {
        if (cancelled) return;
        const pageData = res.data || [];
        // Fetched here, not through the app's navigation, so context.seasonId is never set:
        // startPlayback reads the season from the episode itself.
        const withSeason = pageData.map((ep) => ({ ...ep, season_id: selectedSeasonId }));
        setEpisodes(withSeason);
        const total = res.total_items;
        setHasMoreEpisodes(pageData.length > 0 && (typeof total !== 'number' || withSeason.length < total));
      })
      .catch(() => {
        if (!cancelled) {
          setEpisodes([]);
          setHasMoreEpisodes(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingEpisodes(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeasonId, seriesItem.id, episodesUpdated]);

  // Guards against a second request while one is in flight.
  const loadingMoreRef = useRef(false);
  const loadMore = useRef(async () => {});
  loadMore.current = async () => {
    if (loadingMoreRef.current || !hasMoreEpisodes || !selectedSeasonId) return;
    loadingMoreRef.current = true;
    setLoadingMoreEpisodes(true);
    const nextPage = episodePage + 1;
    try {
      const res = await getSeries({ movieId: seriesItem.id, seasonId: selectedSeasonId, page: nextPage, pageAtaTime: 1, category });
      const pageData = res.data || [];
      const withSeason = pageData.map((ep) => ({ ...ep, season_id: selectedSeasonId }));
      setEpisodes((prev) => [...prev, ...withSeason]);
      setEpisodePage(nextPage);
      const total = res.total_items;
      const newTotalLoaded = episodes.length + withSeason.length;
      setHasMoreEpisodes(pageData.length > 0 && (typeof total !== 'number' || newTotalLoaded < total));
    } catch {
      setHasMoreEpisodes(false);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMoreEpisodes(false);
    }
  };

  const progressByMediaId = useMemo(() => {
    const map = new Map<string, ProgressRecord>();
    for (const record of progressRecords) map.set(String(record.mediaId), record);
    return map;
  }, [progressRecords]);

  // The episode being resumed, once its page is loaded. Portals list newest first, so it is
  // often not on page 1: keep loading pages (bounded) until it shows up.
  const resumeEpisode = useMemo(
    () => (continueRecord && String(continueRecord.meta?.seasonId ?? '') === String(selectedSeasonId ?? '') ? findResumeEpisode(continueRecord, episodes) : null),
    [continueRecord, episodes, selectedSeasonId],
  );
  useEffect(() => {
    const wantsMore = continueRecord && !resumeEpisode && hasMoreEpisodes && !loadingEpisodes && !loadingMoreEpisodes &&
      String(continueRecord.meta?.seasonId ?? '') === String(selectedSeasonId ?? '') && episodePage < 15;
    if (wantsMore) void loadMore.current();
  }, [continueRecord, resumeEpisode, hasMoreEpisodes, loadingEpisodes, loadingMoreEpisodes, selectedSeasonId, episodePage]);

  return {
    selectedSeasonId,
    setSelectedSeasonId,
    episodes,
    loadingEpisodes,
    loadingMoreEpisodes,
    hasMoreEpisodes,
    loadMore: () => loadMore.current(),
    continueRecord,
    resumeEpisode,
    progressByMediaId,
  };
}
