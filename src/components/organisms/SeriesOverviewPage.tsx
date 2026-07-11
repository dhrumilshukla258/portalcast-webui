import React, { useMemo, useState } from 'react';
import { ArrowLeft, Play, Star, Calendar, Globe2, Film } from 'lucide-react';
import type { MediaItem } from '@/types';
import type { ProgressRecord } from '@/services/services';
import { URL_PATHS } from '@/services/api';

interface SeriesOverviewPageProps {
  seriesItem: MediaItem;
  seasons: MediaItem[];
  loadingSeasons: boolean;
  progressRecords: ProgressRecord[];
  onSelectSeason: (season: MediaItem) => void;
  onContinueWatching?: () => void;
  onBack: () => void;
}

// Mirrors SeasonEpisodesPage's structure on purpose: a compact top info bar, then content
// stacked full-width below — so the series page and season page read as the same design
// instead of one being a tall narrow column and the other a full-width list.
const SeriesOverviewPage: React.FC<SeriesOverviewPageProps> = ({
  seriesItem,
  seasons,
  loadingSeasons,
  progressRecords,
  onSelectSeason,
  onContinueWatching,
  onBack,
}) => {
  const baseUrl = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
  const displayTitle = seriesItem.title || seriesItem.name || 'Series';
  const [showTrailer, setShowTrailer] = useState(false);

  const posterUrl = useMemo(() => {
    const uri = seriesItem.screenshot_uri;
    if (typeof uri !== 'string' || !uri) return null;
    return uri.startsWith('http') ? uri : `${baseUrl}/api/images${uri}`;
  }, [seriesItem.screenshot_uri, baseUrl]);

  const backdropUrl = useMemo(() => {
    const uri = seriesItem.backdrop_path;
    if (typeof uri !== 'string' || !uri) return null;
    return uri.startsWith('http') ? uri : `${baseUrl}/api/images${uri}`;
  }, [seriesItem.backdrop_path, baseUrl]);

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
    <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-4">
      {backdropUrl && (
        <div
          className="pointer-events-none fixed inset-0 -z-10 opacity-[0.12] blur-2xl"
          style={{
            backgroundImage: `url(${backdropUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      <button
        onClick={onBack}
        data-focusable="true"
        aria-label="Back"
        className="flex w-fit shrink-0 items-center gap-2 rounded-full border border-gray-800/80 bg-gray-900/40 px-3 py-2 text-sm font-bold text-gray-300 transition-colors hover:bg-gray-800/60 hover:text-white"
      >
        <ArrowLeft size={16} />
        <span>Back</span>
      </button>

      {/* Compact top info bar — same shape as the season page's header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#071329]/95 shadow-2xl">
        {backdropUrl && (
          <div className="relative h-32 w-full shrink-0 overflow-hidden sm:h-44">
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
          <div className="relative aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/30 shadow-lg sm:w-20">
            {posterUrl ? (
              <img src={posterUrl} alt={displayTitle} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/10 to-transparent">
                <span className="select-none text-lg font-extrabold text-white/20">
                  {displayTitle.substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-wider text-blue-400">
              {seriesItem.genres_str?.split(',')[0]?.trim() || 'Series'}
            </p>
            <h1 className="truncate text-xl font-black tracking-tight text-white sm:text-2xl">
              {displayTitle}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-300">
              {parseFloat(String(seriesItem.rating_imdb)) > 0 && (
                <div className="flex items-center gap-1 rounded bg-yellow-400/10 px-2 py-0.5 font-bold text-yellow-400">
                  <Star size={11} className="fill-current" />
                  <span>{seriesItem.rating_imdb} / 10</span>
                </div>
              )}
              {seriesItem.year && (
                <div className="flex items-center gap-1 text-gray-400">
                  <Calendar size={11} />
                  <span>{seriesItem.year}</span>
                </div>
              )}
              {seriesItem.country && (
                <div className="flex items-center gap-1 text-gray-400">
                  <Globe2 size={11} />
                  <span>{seriesItem.country}</span>
                </div>
              )}
              <span className="text-gray-500">{seasons.length || 0} season{seasons.length === 1 ? '' : 's'}</span>
            </div>
          </div>
          {seriesItem.trailer_key && (
            <button
              onClick={() => setShowTrailer((prev) => !prev)}
              data-focusable="true"
              className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-gray-200 transition-colors hover:bg-white/10"
            >
              <Film size={16} />
              <span className="hidden sm:inline">{showTrailer ? 'Hide Trailer' : 'Trailer'}</span>
            </button>
          )}
        </div>
      </div>

      {showTrailer && seriesItem.trailer_key && (
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${seriesItem.trailer_key}`}
            title="Trailer"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {continueEntry && onContinueWatching && (
        <button
          onClick={onContinueWatching}
          data-focusable="true"
          className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition-colors hover:bg-white/10 sm:w-96"
        >
          <div className="relative flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/30">
            {continueImageUrl ? (
              <img src={continueImageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Play size={20} className="text-white/40" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-bold text-white">
              {continueEntry.meta?.episodeTitle || continueEntry.meta?.name || 'Continue'}
            </h4>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${continueEntry.meta?.progressPercent || 0}%` }}
              />
            </div>
          </div>
        </button>
      )}

      {seriesItem.genres_str && (
        <div className="flex flex-wrap gap-1.5">
          {String(seriesItem.genres_str).split(',').map((genre, i) => (
            <span
              key={i}
              className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-gray-300"
            >
              {genre.trim()}
            </span>
          ))}
        </div>
      )}

      {seriesItem.description && (
        <p className="text-sm leading-relaxed text-gray-300">{seriesItem.description}</p>
      )}

      {seriesItem.actors && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">Cast</h3>
          <div className="flex flex-wrap gap-1.5">
            {String(seriesItem.actors)
              .split(',')
              .map((actor) => actor.trim())
              .filter(Boolean)
              .map((actor, i) => (
                <span
                  key={i}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-gray-300"
                >
                  {actor}
                </span>
              ))}
          </div>
        </div>
      )}

      {(seriesItem.director || seriesItem.rating_mpaa) && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {seriesItem.director && (
            <div className="flex gap-2">
              <span className="text-gray-500">Director</span>
              <span className="text-gray-300">{seriesItem.director}</span>
            </div>
          )}
          {seriesItem.rating_mpaa && (
            <div className="flex gap-2">
              <span className="text-gray-500">Rating</span>
              <span className="text-gray-300">{seriesItem.rating_mpaa}</span>
            </div>
          )}
        </div>
      )}

      {/* Seasons — full width, same rhythm as the episode list on the season page */}
      <div className="space-y-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">Seasons</h3>
        {seasons.length === 0 && loadingSeasons ? (
          <div className="flex w-full justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500" />
          </div>
        ) : seasons.length === 0 ? (
          <p className="py-4 text-sm text-gray-500">No seasons found.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {seasons.map((season, index) => {
              const imgUri = season.screenshot_uri;
              const imgUrl = typeof imgUri === 'string' && imgUri
                ? imgUri.startsWith('http')
                  ? imgUri
                  : `${baseUrl}/api/images${imgUri}`
                : null;
              return (
                <button
                  key={`${season.id}-${index}`}
                  onClick={() => onSelectSeason(season)}
                  data-focusable="true"
                  className="group flex flex-col gap-2 text-left"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-white/10 bg-black/30 transition-transform duration-200 group-hover:scale-[1.03]">
                    {imgUrl ? (
                      <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/10 to-transparent">
                        <span className="select-none text-4xl font-black text-white/20">
                          S{index + 1}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="truncate text-sm font-bold text-gray-200">
                    {season.title || season.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SeriesOverviewPage;
