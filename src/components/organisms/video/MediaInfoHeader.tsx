import { getTitleDetails, type PersonCredit, type TitleDetails } from '@/api/endpoints/discover';
import { useOpenGenre, useOpenPerson } from '@/context/PersonPageContext';
import React, { useMemo } from 'react';
import { Play, Clock, Star, Calendar, Globe2, Film, Image as ImageIcon, Link2, Merge } from 'lucide-react';
import { runtimeText } from '@/utils/episodeInfo';
import { useParallax } from '@/hooks/useParallax';
import { useAuth } from '@/context/AuthContext';
import EditImagesDialog from '@/components/organisms/admin/EditImagesDialog';
import { PortalFixMatch } from '@/components/organisms/admin/FixMatchDialog';
import MergeTitleDialog from '@/components/organisms/admin/MergeTitleDialog';
import type { MediaItem } from '@/types';
import { URL_PATHS } from '@/api/config';
import { MoreLikeThis, MyListButton, VersionsButton } from '@/components/molecules/TitleExtras';

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
  // Its content id ("movie_29467"). A title opened from Search carries its bare id ("29467"),
  // which the raw lookup below does not find: so the type is put in front of it too.
  const ownId = String(item.catalogId || item.id || '');
  const detailsKey = /^(movie|series)_/.test(ownId) ? ownId : `${item.is_series ? 'series' : 'movie'}_${ownId}`;
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
  const [fixingMatch, setFixingMatch] = React.useState(false);
  const [merging, setMerging] = React.useState(false);
  const logo = details?.logo || item.logo_path;
  const tagline = details?.tagline || item.tagline;
  const facts = [details?.studios || item.studios, details?.collection || item.collection].filter(Boolean) as string[];
  const writers = details?.writers || item.writers;
  const openPerson = useOpenPerson();
  // Cast first (with characters), then creators, directors and writers (with the job).
  const people = React.useMemo(() => {
    if (!details) return [];
    const list: { person: PersonCredit; line: string | null }[] = [
      // ?? []: a partial answer (an older server, a title not matched yet) must not crash the page.
      ...(details.cast ?? []).slice(0, 16).map((c) => ({ person: c, line: c.role || null })),
      ...(details.creators ?? []).map((c) => ({ person: c, line: 'Creator' })),
      ...(details.directors ?? []).map((c) => ({ person: c, line: 'Director' })),
      ...(details.writersPeople ?? []).slice(0, 4).map((c) => ({ person: c, line: c.role || 'Writer' })),
    ];
    const seen = new Set<string>();
    return list.filter((e) => {
      const k = `${e.person.id ?? e.person.name}|${e.line}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [details]);
  const ageRating = details?.ageRating || item.rating_mpaa;
  // A movie's length: TMDB's (minutes), else the portal's own; a series' is per episode.
  const runtime = item.is_series ? null : runtimeText(Number(details?.runtime) || Number(item.duration) || 0);

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
  // A genre opens Movies (or Shows) filtered to it.
  const openGenre = useOpenGenre();
  // The backdrop drifts slower than the page as it scrolls (the theme's parallax; none in Classic).
  const backdropRef = React.useRef<HTMLImageElement>(null);
  useParallax(backdropRef, backdropUrl);

  return (
    // The title's page (owner 2026-10-29: its own page, like the Android TV app's): the
    // backdrop edge to edge across the top, fading into the page, with the poster, buttons and
    // details over its lower part; everything below in one centred column.
    <div className="relative">
      {backdropUrl && (
        <div className="absolute inset-x-0 top-0 z-0 h-[48vh] min-h-64 overflow-hidden sm:h-[66vh]">
          <img
            ref={backdropRef}
            key={backdropUrl}
            src={backdropUrl}
            alt=""
            aria-hidden="true"
            decoding="async"
            onLoad={(e) => { e.currentTarget.style.opacity = '1'; }}
            style={{ opacity: 0 }}
            className="h-full w-full object-cover transition-opacity duration-500"
          />
          <div className="absolute inset-0 bg-linear-to-t from-page via-page/60 to-page/10" />
          <div className="absolute inset-0 hidden bg-linear-to-r from-page/80 via-page/20 to-transparent md:block" />
        </div>
      )}
      <div className={`relative z-1 mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-8 md:flex-row md:gap-8 ${backdropUrl ? 'pt-[26vh] sm:pt-[38vh]' : 'pt-20'}`}>
        {/* Poster Column */}
        <div className="flex w-full shrink-0 flex-col items-center justify-start md:w-48 lg:w-56">
          <div className="relative aspect-2/3 w-44 overflow-hidden rounded-2xl border border-line bg-black/30 shadow-2xl md:w-full">
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

          <div className="mt-4 flex w-full flex-col gap-2">
            {onPlay && (
              <button
                onClick={onPlay}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 font-bold text-surface-3 shadow-lg shadow-black/30 transition-all duration-200 hover:bg-gray-200 active:scale-95 focus:outline-hidden focus:ring-2 focus:ring-accent [&.focused]:ring-2 [&.focused]:ring-accent"
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
                data-ui="title-action"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-white/5 py-3 font-bold text-fg-soft transition-colors hover:bg-white/10"
              >
                <Film size={18} />
                <span>{showTrailer ? 'Hide Trailer' : 'Trailer'}</span>
              </button>
            )}
            <MyListButton contentId={detailsKey} />
            {/* A movie switches version in the player (Settings → Version); a show, here. */}
            {!!item.is_series && <VersionsButton contentId={detailsKey} />}
          </div>
        </div>

        {/* Meta / Details Column */}
        <div className="flex w-full max-w-2xl flex-col gap-4 text-left">
          <div>
            {logo ? (
              <img src={logo} alt={displayTitle} className="max-h-20 max-w-[min(100%,420px)] object-contain object-left md:max-h-28" />
            ) : (
              <h1 className="text-2xl font-black leading-none tracking-tight text-fg md:text-4xl">
                {displayTitle}
              </h1>
            )}
            {tagline && <p className="mt-2 text-sm italic text-fg-muted md:text-base">{tagline}</p>}
            {isAdmin && /^(movie|series)_/.test(detailsKey) && (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEditingImages(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs font-semibold text-fg-muted hover:bg-white/10 hover:text-fg-soft"
                  data-focusable="true"
                >
                  <ImageIcon size={13} /> Edit images
                </button>
                {/* Local library titles ("movie_L12") have theirs in Admin → Libraries. */}
                {!/^(movie|series)_L\d+$/.test(detailsKey) && (
                  <button
                    type="button"
                    onClick={() => setFixingMatch(true)}
                    className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs font-semibold text-fg-muted hover:bg-white/10 hover:text-fg-soft"
                    data-focusable="true"
                  >
                    <Link2 size={13} /> Fix match
                  </button>
                )}
                {/* Titles that are one film or show but do not show as versions (owner 2026-11-05). */}
                <button
                  type="button"
                  onClick={() => setMerging(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs font-semibold text-fg-muted hover:bg-white/10 hover:text-fg-soft"
                  data-focusable="true"
                >
                  <Merge size={13} /> Merge with…
                </button>
              </div>
            )}
            {item.director && (
              <p className="mt-1 text-sm text-fg-muted">
                {creditLabel} <span className="font-semibold text-gray-300">{item.director}</span>
              </p>
            )}
          </div>

          <div data-ui="title-meta" className="flex flex-wrap items-center gap-2.5 border-y border-white/5 py-3 text-xs text-gray-300 sm:gap-4 sm:text-sm">
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
                <a href={imdbUrl} target="_blank" rel="noopener noreferrer" title="Open on IMDb" data-ui="rating" className={`${cls} hover:bg-yellow-400/20`}>
                  {chip}
                </a>
              ) : (
                <div data-ui="rating" className={cls}>{chip}</div>
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
              <div className="flex items-center gap-1 text-fg-muted">
                <Calendar size={14} data-ui="meta-icon" />
                <span>{item.year}</span>
              </div>
            )}
            {item.country && (
              <div className="flex items-center gap-1 text-fg-muted">
                <Globe2 size={14} data-ui="meta-icon" />
                <span>{item.country}</span>
              </div>
            )}
            {runtime && (
              <div className="flex items-center gap-1 text-fg-muted">
                <Clock size={14} data-ui="meta-icon" />
                <span>{runtime}</span>
              </div>
            )}
            {ageRating && (
              <div data-ui="meta-badge" className="rounded-full border border-gray-600 px-2 py-0.5 text-3xs font-black text-fg-muted">
                {ageRating}
              </div>
            )}
            {metaExtra}
          </div>

          {item.genres_str && (
            <div data-ui="genres" className="flex flex-wrap gap-1.5">
              {String(item.genres_str).split(',').map((g) => g.trim()).filter(Boolean).map((genre) =>
                openGenre ? (
                  <button
                    key={genre}
                    type="button"
                    data-ui="genre"
                    data-focusable="true"
                    onClick={() => openGenre(genre, item.is_series ? 'series' : 'movie')}
                    title={`More ${genre}`}
                    className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-gray-300 transition-colors hover:bg-white/15 hover:text-fg"
                  >
                    {genre}
                  </button>
                ) : (
                  <span key={genre} data-ui="genre" className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-gray-300">
                    {genre}
                  </span>
                ),
              )}
            </div>
          )}

          {item.description && (
            <div className="space-y-1">
              <h3 className="ui-label">Overview</h3>
              <p className="text-sm font-medium leading-relaxed text-gray-300 md:text-base">
                {item.description}
              </p>
            </div>
          )}

          {(facts.length > 0 || writers) && (
            <div className="space-y-1 text-sm text-fg-muted">
              {facts.length > 0 && <p>{facts.join('  \u00b7  ')}</p>}
              {writers && !item.is_series && (
                <p>
                  Written by <span className="font-semibold text-gray-300">{writers}</span>
                </p>
              )}
            </div>
          )}

          {people.length > 0 ? (
            <div className="space-y-2">
              <h3 className="ui-label">Cast &amp; crew</h3>
              <div className="flex gap-2 overflow-x-auto px-1 pb-2 pt-1 custom-scrollbar">
                {people.map(({ person: c, line }, i) => {
                  const body = (
                    <>
                      {c.photo ? (
                        <img src={c.photo} alt={c.name} loading="lazy" className="mx-auto h-16 w-16 rounded-full object-cover" />
                      ) : (
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-fg-muted">
                          {c.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                        </div>
                      )}
                      <div className="mt-1 truncate text-xs font-semibold text-fg-soft">{c.name}</div>
                      {line && <div className="truncate text-2xs text-fg-subtle">{line}</div>}
                    </>
                  );
                  // Each person opens their page with every title of theirs (servers from 2026-10-21 send ids).
                  return openPerson && c.id ? (
                    <button
                      key={`${i}-${c.id}`}
                      type="button"
                      onClick={() => openPerson(c.id!)}
                      title={`${c.name}: all titles`}
                      data-focusable="true"
                      className="w-22 shrink-0 rounded-xl p-1 text-center transition-colors hover:bg-white/10 focus:bg-white/10 focus:outline-hidden focus:ring-2 focus:ring-focus"
                    >
                      {body}
                    </button>
                  ) : (
                    <div key={`${i}-${c.name}`} className="w-22 shrink-0 p-1 text-center">
                      {body}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : item.actors && (
            <div className="space-y-2">
              <h3 className="ui-label">Cast</h3>
              <div className="flex flex-wrap gap-2">
                {item.actors
                  .split(',')
                  .map((actor) => actor.trim())
                  .filter(Boolean)
                  .map((actor, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-line bg-white/5 px-3 py-1 text-xs font-semibold text-gray-300"
                    >
                      {actor}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {fixingMatch && (
        <PortalFixMatch
          contentId={detailsKey}
          onClose={() => setFixingMatch(false)}
          onChanged={() => void getTitleDetails({ id: detailsKey }).then(setDetails)}
        />
      )}

      {merging && (
        <MergeTitleDialog
          contentId={detailsKey}
          onClose={() => setMerging(false)}
          onChanged={() => void getTitleDetails({ id: detailsKey }).then(setDetails)}
        />
      )}

      {editingImages && (
        <EditImagesDialog
          contentId={detailsKey}
          title={displayTitle}
          onClose={() => setEditingImages(false)}
          onChanged={() => void getTitleDetails({ id: detailsKey }).then(setDetails)}
        />
      )}

      {showTrailer && trailerKey && (
        <div className="mx-auto mt-6 aspect-video w-full max-w-6xl overflow-hidden bg-black sm:rounded-xl">
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
        <div className="mx-auto mt-6 max-w-6xl px-4 sm:px-8">{children}</div>
      )}

      <div className="mx-auto mt-4 max-w-6xl sm:px-2">
        <MoreLikeThis contentId={detailsKey} />
      </div>
    </div>
  );
};
