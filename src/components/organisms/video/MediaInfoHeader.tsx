import { getTitleDetails, type TitleDetails } from '@/api/endpoints/discover';
import React, { useMemo } from 'react';
import { Play, Clock, Star, Calendar, Globe2, Film, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import EditImagesDialog from '@/components/organisms/admin/EditImagesDialog';
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
  // "Directed by" for a film; a series lists its creators ("Created by").
  creditLabel?: string;
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
  creditLabel = 'Directed by',
}) => {
  const [showTrailer, setShowTrailer] = React.useState(false);
  const baseUrl = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
  const displayTitle = item.title || item.name || 'Details';
  // One main rating with its source: the server's pick (IMDb, else TMDB, else TVmaze), else
  // the portal's IMDb field. Critics' scores (Rotten Tomatoes, Metacritic) sit beside it.
  const hasBest = parseFloat(String(item.rating_best)) > 0;
  const rating = hasBest ? item.rating_best : parseFloat(String(item.rating_imdb)) > 0 ? String(item.rating_imdb) : undefined;
  const ratingSource = hasBest ? item.rating_source : rating ? 'IMDb' : undefined;
  const imdbUrl = item.imdb_id && /^tt\d+$/.test(item.imdb_id) ? `https://www.imdb.com/title/${item.imdb_id}/` : undefined;
  const metascore = Number(item.metascore) > 0 ? Number(item.metascore) : undefined;

  // Tagline, age rating, studios, logo, cast with photos (server /api/v2/discover/details).
  const [details, setDetails] = React.useState<TitleDetails | null>(null);
  const detailsKey = item.catalogId || `${item.is_series ? 'series' : 'movie'}_${item.id}`;
  React.useEffect(() => {
    let cancelled = false;
    setDetails(null);
    const params = /^(movie|series)_/.test(detailsKey)
      ? { id: detailsKey }
      : { type: (item.is_series ? 'series' : 'movie') as 'movie' | 'series', raw: String(item.id) };
    void getTitleDetails(params).then((d) => {
      if (!cancelled) setDetails(d);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailsKey]);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [editingImages, setEditingImages] = React.useState(false);
  const logo = details?.logo || item.logo_path;
  const tagline = details?.tagline || item.tagline;
  const facts = [details?.studios || item.studios, details?.collection || item.collection].filter(Boolean) as string[];
  const writers = details?.writers || item.writers;
  const ageRating = details?.ageRating || item.rating_mpaa;

  const imageUrl = useMemo(() => {
    if (typeof item.screenshot_uri !== 'string' || !item.screenshot_uri) return null;
    return item.screenshot_uri.startsWith('http')
      ? item.screenshot_uri
      : `${baseUrl}/api/images${item.screenshot_uri}`;
  }, [item.screenshot_uri, baseUrl]);

  // Per-item backdrop banner — the panel's own imagery rather than relying
  // solely on the page-level AmbientBackdrop showing through its
  // translucency, which reads as generic/disconnected from whichever title
  // is actually open. HD path preferred since this renders large; falls
  // back to the standard-res one rather than showing nothing.
  const backdropUrl = useMemo(() => {
    const path = item.backdrop_hd_path || item.backdrop_path;
    if (!path) return null;
    return path.startsWith('http') ? path : `${baseUrl}/api/images${path}`;
  }, [item.backdrop_hd_path, item.backdrop_path, baseUrl]);

  return (
    // This card IS the modal/panel and is meant to read as a distinct
    // surface — that's different from the earlier bug, which was a SECOND,
    // separate translucent rectangle (App.tsx's overlay wrapper) sitting
    // behind this one. The backdrop banner below sits INSIDE this panel,
    // under a gradient that fades to the panel's own bg-black/70 toward the
    // bottom so the meta/poster content stays readable — it doesn't
    // reintroduce that second-rectangle bug since there's still only one
    // surface here.
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/70 shadow-2xl">
      {backdropUrl && (
        <>
          <img
            src={backdropUrl}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 z-0 h-64 w-full object-cover sm:h-80"
          />
          <div className="absolute inset-x-0 top-0 z-0 h-64 bg-linear-to-t from-black/70 via-black/40 to-black/10 sm:h-80" />
          <div className="absolute inset-x-0 top-0 z-0 h-64 bg-linear-to-b from-black/10 via-transparent to-black/70 sm:h-80" />
        </>
      )}
      <div className={`relative z-1 flex flex-col gap-6 p-4 sm:p-6 md:flex-row md:gap-8 ${backdropUrl ? 'pt-40 sm:pt-56' : 'pt-6'}`}>
        {/* Poster Column */}
        <div className="flex w-full shrink-0 flex-col items-center justify-start md:w-48 lg:w-56">
          <div className="relative aspect-2/3 w-44 overflow-hidden rounded-2xl border border-white/10 bg-black/30 shadow-2xl md:w-full">
            {imageUrl ? (
              <img src={imageUrl} alt={displayTitle} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-white/10 to-transparent">
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
            {logo ? (
              <img src={logo} alt={displayTitle} className="max-h-20 max-w-[min(100%,420px)] object-contain object-left md:max-h-28" />
            ) : (
              <h1 className="text-2xl font-black leading-none tracking-tight text-white md:text-4xl">
                {displayTitle}
              </h1>
            )}
            {tagline && <p className="mt-2 text-sm italic text-gray-400 md:text-base">{tagline}</p>}
            {isAdmin && /^(movie|series)_/.test(detailsKey) && (
              <button
                type="button"
                onClick={() => setEditingImages(true)}
                className="mt-2 inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs font-semibold text-gray-400 hover:bg-white/10 hover:text-gray-200"
                data-focusable="true"
              >
                <ImageIcon size={13} /> Edit images
              </button>
            )}
            {item.director && (
              <p className="mt-1 text-sm text-gray-400">
                {creditLabel} <span className="font-semibold text-gray-300">{item.director}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 border-y border-white/5 py-3 text-xs text-gray-300 sm:gap-4 sm:text-sm">
            {rating && (() => {
              const chip = (
                <>
                  <Star size={14} className="fill-current" />
                  <span>{rating} / 10</span>
                  {ratingSource && <span className="font-medium text-yellow-400/70">{ratingSource}</span>}
                </>
              );
              const cls = 'flex items-center gap-1 rounded-full bg-yellow-400/10 px-2.5 py-1 font-bold text-yellow-400';
              return ratingSource === 'IMDb' && imdbUrl ? (
                <a href={imdbUrl} target="_blank" rel="noopener noreferrer" title="Open on IMDb" className={`${cls} hover:bg-yellow-400/20`}>
                  {chip}
                </a>
              ) : (
                <div className={cls}>{chip}</div>
              );
            })()}
            {item.rt_rating && (
              <div className="flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 font-bold text-red-400" title="Rotten Tomatoes">
                <span aria-hidden>🍅</span>
                <span>{item.rt_rating}</span>
              </div>
            )}
            {metascore && (
              <div className="flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 font-bold text-green-400" title="Metacritic">
                <span>Metacritic {metascore}</span>
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
            {ageRating && (
              <div className="rounded-full border border-gray-600 px-2 py-0.5 text-[10px] font-black text-gray-400">
                {ageRating}
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

          {(facts.length > 0 || writers) && (
            <div className="space-y-1 text-sm text-gray-400">
              {facts.length > 0 && <p>{facts.join('  \u00b7  ')}</p>}
              {writers && !item.is_series && (
                <p>
                  Written by <span className="font-semibold text-gray-300">{writers}</span>
                </p>
              )}
            </div>
          )}

          {details && details.cast.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">Cast</h3>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {details.cast.slice(0, 12).map((c) => (
                  <div key={`${c.name}-${c.role ?? ''}`} className="w-20 shrink-0 text-center">
                    {c.photo ? (
                      <img src={c.photo} alt={c.name} loading="lazy" className="mx-auto h-16 w-16 rounded-full object-cover" />
                    ) : (
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-gray-400">
                        {c.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                      </div>
                    )}
                    <div className="mt-1 truncate text-xs font-semibold text-gray-200">{c.name}</div>
                    {c.role && <div className="truncate text-[11px] text-gray-500">{c.role}</div>}
                  </div>
                ))}
              </div>
            </div>
          ) : item.actors && (
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

      {editingImages && (
        <EditImagesDialog
          contentId={detailsKey}
          title={displayTitle}
          onClose={() => setEditingImages(false)}
          onChanged={() => void getTitleDetails({ id: detailsKey }).then(setDetails)}
        />
      )}

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
