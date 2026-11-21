import React, { useEffect, useMemo, useRef } from 'react';
import { Play, Layers } from 'lucide-react';
import type { MediaItem } from '@/types';
import type { ProgressRecord } from '@/api/types/user';
import { URL_PATHS } from '@/api/config';
import { MediaInfoHeader } from '@/components/organisms/video/MediaInfoHeader';
import EpisodeAccordionRow from '@/components/molecules/EpisodeAccordionRow';
import { useSeasonEpisodes } from '@/hooks/useSeasonEpisodes';
import { seasonLabel, seasonNumberOf } from '@/utils/seasonNumber';

interface SeriesOverviewPageProps {
  seriesItem: MediaItem;
  seasons: MediaItem[];
  loadingSeasons: boolean;
  progressRecords: ProgressRecord[];
  onSelectSeason: (season: MediaItem) => void;
  onPlayEpisode: (episode: MediaItem) => void;
  onContinueWatching?: () => void;
  onBack: () => void;
}

// Uses the same MediaInfoHeader as the movie detail page — everything
// (poster, title, rating/year/country, genres, overview, cast) contained in
// one card, matching the movie page's layout. Seasons render as tabs inside
// that same card: picking one fetches and shows its episode list right
// there instead of navigating to a separate page — no page swap, no
// back-button position jump, no extra history entry to back out of.
const SeriesOverviewPage: React.FC<SeriesOverviewPageProps> = ({
  seriesItem,
  seasons: listed,
  loadingSeasons,
  progressRecords,
  onPlayEpisode,
  onContinueWatching,
}) => {
  const baseUrl = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
  // An episode without a still shows the show's own backdrop (else its poster), dimmed.
  const episodeFallback = useMemo(() => {
    const path = seriesItem.backdrop_path || seriesItem.screenshot_uri;
    if (!path) return null;
    return String(path).startsWith('http') ? String(path) : `${baseUrl}/api/images${path}`;
  }, [seriesItem.backdrop_path, seriesItem.screenshot_uri, baseUrl]);
  // Season 1 first (providers list the newest first), Specials (season 0) last.
  const seasons = useMemo(
    () =>
      listed
        .map((season, index) => ({ season, n: seasonNumberOf(season, index) }))
        .sort((a, b) => Number(a.n === 0) - Number(b.n === 0) || a.n - b.n)
        .map((k) => k.season),
    [listed]
  );
  const {
    selectedSeasonId,
    setSelectedSeasonId,
    episodes,
    loadingEpisodes,
    loadingMoreEpisodes,
    hasMoreEpisodes,
    loadMore,
    continueRecord,
    resumeEpisode,
    progressByMediaId,
  } = useSeasonEpisodes(seriesItem, seasons, progressRecords);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  // Scroll-triggered "load more" — the episode list lives inside the page's
  // own scroll (not a fixed-height list of its own), so a sentinel element
  // at the bottom + IntersectionObserver is what actually detects "user
  // scrolled near the end", regardless of which ancestor is scrolling.
  useEffect(() => {
    if (!hasMoreEpisodes || loadingEpisodes) return;
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: '400px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMoreEpisodes, loadingEpisodes]);

  const resumeRowRef = useRef<HTMLButtonElement | null>(null);
  const scrolledToResume = useRef<string | null>(null);
  useEffect(() => {
    if (!resumeEpisode || scrolledToResume.current === String(resumeEpisode.id)) return;
    scrolledToResume.current = String(resumeEpisode.id);
    requestAnimationFrame(() => {
      resumeRowRef.current?.scrollIntoView({ block: 'center' });
      resumeRowRef.current?.focus({ preventScroll: true });
    });
  }, [resumeEpisode]);

  // Best-effort "Continue Watching" for this series — a progress record saved against the
  // series' own id (not a specific episode) carries the last-played episode's info in meta.
  const continueEntry = useMemo(() => {
    const record = progressRecords.find((r) => String(r.mediaId) === String(seriesItem.id));
    if (!record || record.completed) return null;
    return record;
  }, [progressRecords, seriesItem.id]);

  const continueImageUrl = useMemo(() => {
    const uri = continueEntry?.meta?.screenshot_uri;
    if (typeof uri !== 'string' || !uri) return null;
    return uri.startsWith('http') ? uri : `${baseUrl}/api/images${uri}`;
  }, [continueEntry, baseUrl]);

  return (
    <div className="relative flex w-full flex-col gap-4">
      <MediaInfoHeader
        item={seriesItem}
        creditLabel="Created by"
        trailerKey={seriesItem.trailer_key}
        metaExtra={
          <span className="text-fg-muted">
            {seasons.length || 0} season{seasons.length === 1 ? '' : 's'}
          </span>
        }
      >
        <h3 className="ui-label mb-3 flex items-center gap-2">
          <Layers size={13} data-ui="section-icon" />
          Seasons
        </h3>

        {seasons.length === 0 && loadingSeasons ? (
          <div className="flex w-full justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-accent" />
          </div>
        ) : seasons.length === 0 ? (
          <p className="py-2 text-sm text-fg-subtle">No seasons found.</p>
        ) : (
          <>
            {/* Season tabs — picking one loads its episodes below, inline. */}
            <div className="flex flex-wrap gap-2">
              {seasons.map((season, index) => {
                const isActive = season.id === selectedSeasonId;
                const number = seasonNumberOf(season, index);
                return (
                  <button
                    key={`${season.id}-${index}`}
                    onClick={() => setSelectedSeasonId(season.id)}
                    data-focusable="true"
                    data-ui="season-tab"
                    data-active={isActive || undefined}
                    className={`flex items-center gap-2 rounded-xl border py-2 pl-2 pr-3.5 text-left transition-colors ${
                      isActive
                        ? 'border-accent/60 bg-accent/10'
                        : 'border-line bg-white/5 hover:border-focus/40 hover:bg-interaction'
                    }`}
                  >
                    <div data-ui="season-thumb" className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-black/30">
                      {season.screenshot_uri ? (
                        <img
                          src={
                            season.screenshot_uri.startsWith('http')
                              ? season.screenshot_uri
                              : `${baseUrl}/api/images${season.screenshot_uri}`
                          }
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-accent/20 to-transparent">
                          <span className="select-none text-xs font-black text-white/50">
                            {number === 0 ? 'SP' : `S${number}`}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className={`truncate text-sm font-bold ${isActive ? 'text-fg' : 'text-fg-soft'}`}>
                      {seasonLabel(number)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Episode list for whichever season tab is active — kept visible
                (dimmed) while the next season's episodes are loading instead
                of being swapped out for a bare spinner, so switching tabs
                doesn't flash an empty state between seasons. */}
            <div
              className={`mt-4 flex flex-col gap-2 transition-opacity duration-200 ${
                loadingEpisodes ? 'opacity-40' : 'opacity-100'
              }`}
            >
              {episodes.length === 0 && !loadingEpisodes ? (
                <p className="py-4 text-center text-sm text-fg-subtle">No episodes found for this season.</p>
              ) : (
                episodes.map((ep, index) => {
                  const record = progressByMediaId.get(String(ep.id));
                  const isResume = resumeEpisode?.id === ep.id;
                  return (
                    <EpisodeAccordionRow
                      key={`${ep.id}-${index}`}
                      ref={isResume ? resumeRowRef : undefined}
                      item={ep}
                      index={index}
                      seriesTitle={seriesItem.title || seriesItem.name}
                      isCompleted={record?.completed}
                      progressPercent={isResume ? Number(continueRecord?.meta?.progressPercent) || undefined : Number(record?.meta?.progressPercent) || undefined}
                      isResume={isResume}
                      onPlay={onPlayEpisode}
                      isDefaultFocus={resumeEpisode ? isResume : index === 0}
                      fallbackImage={episodeFallback}
                    />
                  );
                })
              )}
              {episodes.length === 0 && loadingEpisodes && (
                <div className="flex w-full justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-accent" />
                </div>
              )}
              {hasMoreEpisodes && !loadingEpisodes && (
                <div ref={loadMoreSentinelRef} className="flex w-full justify-center py-4">
                  {loadingMoreEpisodes && (
                    <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-t-2 border-accent" />
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </MediaInfoHeader>

      {continueEntry && onContinueWatching && (
        <button
          onClick={onContinueWatching}
          data-focusable="true"
          className="flex w-full items-center gap-3 rounded-xl border border-line bg-white/5 p-3 text-left transition-colors hover:bg-interaction sm:w-96"
        >
          <div className="relative flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/30">
            {continueImageUrl ? (
              <img src={continueImageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Play size={20} className="text-white/40" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-bold text-fg">
              {continueEntry.meta?.episodeTitle || continueEntry.meta?.name || 'Continue'}
            </h4>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="ui-accent h-full rounded-full"
                style={{ width: `${continueEntry.meta?.progressPercent || 0}%` }}
              />
            </div>
          </div>
        </button>
      )}
    </div>
  );
};

export default SeriesOverviewPage;
