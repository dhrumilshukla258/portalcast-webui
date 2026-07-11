import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { MediaItem } from '@/types';
import type { ProgressRecord } from '@/services/services';
import EpisodeAccordionRow from '@/components/molecules/EpisodeAccordionRow';
import { URL_PATHS } from '@/services/api';

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
  onBack,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const baseUrl = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;

  useEffect(() => {
    setExpandedId(null);
  }, [seasonTitle]);

  // Prefer imagery unique to this season/episode set; fall back to the series' own art.
  const backdropUrl = useMemo(() => {
    const uri = seriesItem.backdrop_path;
    if (typeof uri !== 'string' || !uri) return null;
    return uri.startsWith('http') ? uri : `${baseUrl}/api/images${uri}`;
  }, [seriesItem.backdrop_path, baseUrl]);

  const posterUrl = useMemo(() => {
    const uri = seriesItem.screenshot_uri;
    if (typeof uri !== 'string' || !uri) return null;
    return uri.startsWith('http') ? uri : `${baseUrl}/api/images${uri}`;
  }, [seriesItem.screenshot_uri, baseUrl]);

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onBack}
        data-focusable="true"
        aria-label="Back"
        className="flex w-fit shrink-0 items-center gap-2 rounded-full border border-gray-800/80 bg-gray-900/40 px-3 py-2 text-sm font-bold text-gray-300 transition-colors hover:bg-gray-800/60 hover:text-white"
      >
        <ArrowLeft size={16} />
        <span>Back</span>
      </button>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#071329]/95 shadow-2xl">
        {backdropUrl && (
          <div className="relative h-40 w-full shrink-0 overflow-hidden sm:h-56">
            <img src={backdropUrl} alt="" className="h-full w-full object-cover" />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'linear-gradient(to top, #071329 0%, rgba(7,19,41,0.35) 35%, rgba(7,19,41,0) 65%)',
              }}
            />
          </div>
        )}
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
              const record = progressRecords.find((r) => String(r.mediaId) === String(ep.id));
              return (
                <EpisodeAccordionRow
                  key={`${ep.id}-${index}`}
                  item={ep}
                  isExpanded={expandedId === ep.id}
                  isCompleted={record?.completed}
                  onToggle={() => setExpandedId((prev) => (prev === ep.id ? null : ep.id))}
                  onPlay={onPlayEpisode}
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
