import React, { useEffect, useMemo, useRef } from 'react';
import type { MediaItem } from '@/types';
import type { ProgressRecord } from '@/api/types/user';
import EpisodeAccordionRow from '@/components/molecules/EpisodeAccordionRow';
import { URL_PATHS } from '@/api/config';
import { latestUnfinished } from '@/utils/resumeEpisode';

interface SeasonEpisodesPageProps {
  seriesItem: MediaItem;
  seasonTitle: string;
  episodes: MediaItem[];
  loadingEpisodes: boolean;
  progressRecords: ProgressRecord[];
  onPlayEpisode: (episode: MediaItem) => void;
  onBack: () => void;
}

const SeasonEpisodesPage: React.FC<SeasonEpisodesPageProps> = ({
  seriesItem,
  seasonTitle,
  episodes,
  loadingEpisodes,
  progressRecords,
  onPlayEpisode,
}) => {
  const baseUrl = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;

  const posterUrl = useMemo(() => {
    const uri = seriesItem.screenshot_uri;
    if (typeof uri !== 'string' || !uri) return null;
    return uri.startsWith('http') ? uri : `${baseUrl}/api/images${uri}`;
  }, [seriesItem.screenshot_uri, baseUrl]);

  // Built once instead of a .find() per rendered episode row.
  const progressByMediaId = useMemo(() => {
    const map = new Map<string, ProgressRecord>();
    for (const record of progressRecords) map.set(String(record.mediaId), record);
    return map;
  }, [progressRecords]);

  // The episode the viewer is in the middle of: marked and scrolled to, once.
  const resumeEpisode = useMemo(() => latestUnfinished(progressRecords, episodes), [progressRecords, episodes]);
  const resumeRowRef = useRef<HTMLButtonElement | null>(null);
  const scrolledTo = useRef<string | null>(null);
  useEffect(() => {
    if (!resumeEpisode || scrolledTo.current === String(resumeEpisode.id)) return;
    scrolledTo.current = String(resumeEpisode.id);
    requestAnimationFrame(() => resumeRowRef.current?.scrollIntoView({ block: 'center' }));
  }, [resumeEpisode]);

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/70 shadow-2xl">
        <div className="flex items-center gap-4 p-4 sm:p-6">
          {posterUrl && (
            <div className="hidden h-24 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 shadow-lg sm:block">
              <img src={posterUrl} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-blue-400">
              {seriesItem.title || seriesItem.name}
            </p>
            <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
              {seasonTitle}
            </h2>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {episodes.length === 0 && loadingEpisodes ? (
          <div className="flex w-full justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500" />
          </div>
        ) : episodes.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">No episodes found for this season.</p>
        ) : (
          <>
            {episodes.map((ep, index) => {
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
                  progressPercent={Number(record?.meta?.progressPercent) || undefined}
                  isResume={isResume}
                  onPlay={onPlayEpisode}
                  isDefaultFocus={resumeEpisode ? isResume : index === 0}
                />
              );
            })}
            {loadingEpisodes && (
              <div className="flex w-full justify-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-blue-500" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SeasonEpisodesPage;
