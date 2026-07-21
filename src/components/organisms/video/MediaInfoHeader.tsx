import React, { useMemo } from 'react';
import { Play, Clock, Star, Calendar, Globe2, Film } from 'lucide-react';
import type { MediaItem } from '@/types';
import { URL_PATHS } from '@/api/config';

interface MediaInfoHeaderProps {
  item: MediaItem;
  onPlay?: () => void;
  playLabel?: string;
  // Extra small meta chips appended to the rating/year/country/duration row
  // — e.g. season count on the series page, which has no equivalent on a
  // plain movie.
  metaExtra?: React.ReactNode;
  // Secondary action button next to Play (or standalone if onPlay isn't
  // given) that toggles an inline trailer embed below the header.
  trailerKey?: string;
  // Extra content rendered inside the same card, below the poster/meta row
  // and the trailer embed — e.g. the series page's Seasons section, so it's
  // contained in the card like everything else instead of floating below it
  // on the page's bare background.
  children?: React.ReactNode;
}

// Shared backdrop/poster/metadata block used by both the movie detail page and the series
// detail page — a single source of truth for "how do we present a title's info" instead of
// duplicating this across pages.
export const MediaInfoHeader: React.FC<MediaInfoHeaderProps> = ({
  item,
  onPlay,
  playLabel = 'Play',
  metaExtra,
  trailerKey,
  children,
}) => {
  const [showTrailer, setShowTrailer] = React.useState(false);
  const baseUrl = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
  const displayTitle = item.title || item.name || 'Details';

  const imageUrl = useMemo(() => {
    if (typeof item.screenshot_uri !== 'string' || !item.screenshot_uri) return null;
    return item.screenshot_uri.startsWith('http')
      ? item.screenshot_uri
      : `${baseUrl}/api/images${item.screenshot_uri}`;
  }, [item.screenshot_uri, baseUrl]);

  return (
    // This card IS the modal/panel and is meant to read as a distinct
    // surface — that's different from the earlier bug, which was a SECOND,
    // separate translucent rectangle (App.tsx's overlay wrapper) sitting
    // behind this one. No per-item backdrop banner though — that part of
    // the original fix stands; the page-level AmbientBackdrop still
    // provides the imagery this card's translucency shows through.
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/70 shadow-2xl">
      <div className="flex flex-col gap-6 p-4 pt-6 sm:p-6 md:flex-row md:gap-8">
        {/* Poster Column */}
        <div className="flex w-full flex-shrink-0 flex-col items-center justify-start md:w-48 lg:w-56">
          <div className="relative aspect-[2/3] w-44 overflow-hidden rounded-2xl border border-white/10 bg-black/30 shadow-2xl md:w-full">
            {imageUrl ? (
              <img src={imageUrl} alt={displayTitle} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/10 to-transparent">
                <span className="select-none text-4xl font-extrabold text-white/20">
                  {displayTitle.substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {(onPlay || trailerKey) && (
          <div className="mt-4 flex w-full flex-col gap-2">
            {onPlay && (
              <button
                onClick={onPlay}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold text-white shadow-lg shadow-blue-500/20 transition-all duration-200 hover:bg-blue-500 active:scale-95"
                data-focusable="true"
                data-default-focus="true"
              >
                <Play size={18} className="fill-current" />
                <span>{playLabel}</span>
              </button>
            )}
            {trailerKey && (
              <button
                onClick={() => setShowTrailer((prev) => !prev)}
                data-focusable="true"
                data-default-focus={!onPlay ? 'true' : undefined}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 font-bold text-gray-200 transition-colors hover:bg-white/10"
              >
                <Film size={18} />
                <span>{showTrailer ? 'Hide Trailer' : 'Trailer'}</span>
              </button>
            )}
          </div>
          )}
        </div>

        {/* Meta / Details Column */}
        <div className="flex w-full max-w-2xl flex-col gap-4 text-left">
          <div>
            <h1 className="text-2xl font-black leading-none tracking-tight text-white md:text-4xl">
              {displayTitle}
            </h1>
            {item.director && (
              <p className="mt-1 text-sm text-gray-400">
                Directed by <span className="font-semibold text-gray-300">{item.director}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 border-y border-white/5 py-3 text-xs text-gray-300 sm:gap-4 sm:text-sm">
            {parseFloat(String(item.rating_imdb)) > 0 && (
              <div className="flex items-center gap-1 rounded-full bg-yellow-400/10 px-2.5 py-1 font-bold text-yellow-400">
                <Star size={14} className="fill-current" />
                <span>{item.rating_imdb} / 10</span>
              </div>
            )}
            {item.year && (
              <div className="flex items-center gap-1 text-gray-400">
                <Calendar size={14} />
                <span>{item.year}</span>
              </div>
            )}
            {item.country && (
              <div className="flex items-center gap-1 text-gray-400">
                <Globe2 size={14} />
                <span>{item.country}</span>
              </div>
            )}
            {item.duration && (
              <div className="flex items-center gap-1 text-gray-400">
                <Clock size={14} />
                <span>{Math.floor(item.duration / 60) || item.duration} mins</span>
              </div>
            )}
            {item.rating_mpaa && (
              <div className="rounded-full border border-gray-600 px-2 py-0.5 text-[10px] font-black text-gray-400">
                {item.rating_mpaa}
              </div>
            )}
            {metaExtra}
          </div>

          {item.genres_str && (
            <div className="flex flex-wrap gap-1.5">
              {String(item.genres_str).split(',').map((genre, i) => (
                <span
                  key={i}
                  className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-gray-300"
                >
                  {genre.trim()}
                </span>
              ))}
            </div>
          )}

          {item.description && (
            <div className="space-y-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">
                Overview
              </h3>
              <p className="text-sm font-medium leading-relaxed text-gray-300 md:text-base">
                {item.description}
              </p>
            </div>
          )}

          {item.actors && (
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">
                Cast
              </h3>
              <div className="flex flex-wrap gap-2">
                {item.actors
                  .split(',')
                  .map((actor) => actor.trim())
                  .filter(Boolean)
                  .map((actor, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gray-300"
                    >
                      {actor}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showTrailer && trailerKey && (
        <div className="aspect-video w-full overflow-hidden border-t border-white/10 bg-black">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${trailerKey}`}
            title="Trailer"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {children && (
        <div className="border-t border-white/10 p-4 sm:p-6">{children}</div>
      )}
    </div>
  );
};
