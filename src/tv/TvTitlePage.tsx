/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { createPortal } from 'react-dom';
import { Check, Play, Plus, Film, Users, Layers } from 'lucide-react';
import { URL_PATHS } from '@/api/config';
import { getMyListIds, getSimilar, getTitleDetails, setInMyList, type PersonCredit, type TitleDetails } from '@/api/endpoints/discover';
import { useOpenPerson, useOpenTitle } from '@/context/PersonPageContext';
import { useSeasonEpisodes } from '@/hooks/useSeasonEpisodes';
import MediaCard from '@/components/molecules/MediaCard';
import { downsize } from '@/utils/imageSize';
import { episodeAirDate, episodeNumber, episodeRuntime, episodeTitle } from '@/utils/episodeInfo';
import { isContentId, ratingLabel } from '@/utils/titleFormat';
import type { MediaItem } from '@/types';
import type { ProgressRecord } from '@/api/types/user';

// The TV apps' title pages, as the Android TV app's (docs/design-system.md, Detail page): the
// backdrop over the whole screen faded in from the left and the bottom, the title's details in a
// column on the left, a row of buttons; a movie then has its Cast and More Like This rows, a
// series its season tabs and episodes on the right.

const base = () => (URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST);
const urlOf = (path: unknown): string | null => {
  if (typeof path !== 'string' || !path) return null;
  if (path.startsWith('http')) return path;
  return path.startsWith('/api/') ? `${base()}${path}` : `${base()}/api/images${path}`;
};
const clean = (s: unknown) => {
  const t = typeof s === 'string' ? s.trim() : s == null ? '' : String(s).trim();
  return t && t !== '-' && t !== 'No description available' ? t : '';
};
const clock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

function useDetails(item: MediaItem) {
  const key = item.catalogId || `${item.is_series ? 'series' : 'movie'}_${item.id}`;
  const [details, setDetails] = React.useState<TitleDetails | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    setDetails(null);
    const params = /^(movie|series)_/.test(key) ? { id: key } : { type: (item.is_series ? 'series' : 'movie') as 'movie' | 'series', raw: String(item.id) };
    void getTitleDetails(params).then((d) => { if (!cancelled) setDetails(d); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { details, contentId: key };
}

/** A button of the row under the details: 44 high, radius 10; `primary` filled. */
const TvButton: React.FC<{ onClick: () => void; primary?: boolean; defaultFocus?: boolean; children: React.ReactNode }> = ({ onClick, primary, defaultFocus, children }) => (
  <button
    type="button"
    onClick={onClick}
    data-focusable="true"
    data-default-focus={defaultFocus ? 'true' : undefined}
    tabIndex={-1}
    className={`flex h-11 shrink-0 items-center gap-2 rounded-[10px] px-5 text-[16px] font-semibold ${primary ? 'bg-sky-600 text-white' : 'bg-[#1E293B]/90 text-slate-100'}`}
  >
    {children}
  </button>
);

const MyListToggle: React.FC<{ contentId: string }> = ({ contentId }) => {
  const [inList, setInList] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    setInList(null);
    if (!isContentId(contentId)) return;
    void getMyListIds().then((ids) => { if (!cancelled && ids) setInList(ids.has(contentId)); });
    return () => { cancelled = true; };
  }, [contentId]);
  if (inList === null) return null;
  const toggle = () => {
    const was = inList;
    setInList(!was);
    setInMyList(contentId, !was).catch(() => setInList(was));
  };
  return (
    <TvButton onClick={toggle}>
      {inList ? <Check className="h-5 w-5 text-sky-400" /> : <Plus className="h-5 w-5" />}
      My List
    </TvButton>
  );
};

/** The backdrop over the whole screen, faded into the page from the left and the bottom. */
const Backdrop: React.FC<{ item: MediaItem }> = ({ item }) => {
  const art = urlOf((item as any).backdrop_hd_path || item.backdrop_path || item.screenshot_uri);
  const [failed, setFailed] = React.useState(false);
  if (!art || failed) return null;
  return (
    <div className="pointer-events-none absolute inset-0">
      <img src={downsize(art, 'w1280')} alt="" className="tv-fade-in h-full w-full object-cover" onError={() => setFailed(true)} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(5,8,15,0.96) 0%, rgba(5,8,15,0.82) 38%, rgba(5,8,15,0.35) 70%, rgba(5,8,15,0.2) 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, #05080F 0%, rgba(5,8,15,0) 50%)' }} />
    </div>
  );
};

/** Logo art (or the name), the meta line, tagline, age and studio, overview, credits. */
const Info: React.FC<{ item: MediaItem; details: TitleDetails | null; extraMeta?: string[]; credit: string; overviewLines: number; castLine?: boolean }> = ({ item, details, extraMeta = [], credit, overviewLines, castLine }) => {
  const it = item as any;
  const logo = urlOf(details?.logo || it.logo_path);
  const [logoFailed, setLogoFailed] = React.useState(false);
  const title = clean(item.title) || clean(item.name);
  const rating = ratingLabel(it.rating_best) ?? (parseFloat(String(it.rating_imdb)) > 0 ? String(it.rating_imdb) : null);
  const source = ratingLabel(it.rating_best) ? it.rating_source : rating ? 'IMDb' : undefined;
  const minutes = Number((details as any)?.runtime ?? it.runtime) || 0;
  const meta = [
    clean(it.year).slice(0, 4),
    rating ? `★ ${rating}${source ? ` ${source}` : ''}` : '',
    clean(it.genres_str).split(/\s*[,/|]\s*/).filter(Boolean).slice(0, 3).join(', '),
    minutes > 0 ? (minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`) : '',
    ...extraMeta,
  ].filter(Boolean);
  const age = clean(details?.ageRating || it.rating_mpaa);
  const studio = clean(details?.studios || it.studios || it.network);
  const tagline = clean(details?.tagline || it.tagline);
  const overview = clean(it.description) || clean(it.plot);
  const credits = clean(it.director);
  const cast = castLine && details?.cast?.length
    ? details.cast.slice(0, 5).map((c: PersonCredit) => (c.role ? `${c.name} (${c.role})` : c.name)).join(', ')
    : '';
  return (
    <div className="text-left">
      {logo && !logoFailed ? (
        <img src={downsize(logo, 'w500')} alt={title} className="mb-4 max-h-[120px] max-w-[360px] object-contain object-left" onError={() => setLogoFailed(true)} />
      ) : (
        <h1 className="mb-3 line-clamp-2 text-[34px] font-bold leading-[1.1] text-white">{title}</h1>
      )}
      {meta.length > 0 && (
        <p className="text-[15px] font-medium text-slate-300">
          {meta.map((m, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="mx-2 text-slate-500">·</span>}
              {m.startsWith('★') ? <><span className="text-amber-400">★</span>{m.slice(1)}</> : m}
            </React.Fragment>
          ))}
        </p>
      )}
      {tagline && <p className="mt-3 text-[16px] italic text-slate-200">{tagline}</p>}
      {(age || studio) && (
        <p className="mt-2 text-[14px] text-slate-400">
          {age && <span className="mr-2 rounded border border-slate-500 px-1.5 py-px text-[12px] font-semibold text-slate-300">{age}</span>}
          {studio}
        </p>
      )}
      {overview && <p className="mt-3 text-[15px] leading-[1.5] text-slate-200" style={{ display: '-webkit-box', WebkitLineClamp: overviewLines, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{overview}</p>}
      {credits && <p className="mt-3 truncate text-[13px] text-slate-400">{credit} {credits}</p>}
      {cast && <p className="truncate text-[13px] text-slate-400">Cast: {cast}</p>}
    </div>
  );
};

/** Cast and crew: round photos 88, name and role under them; a person opens their page. */
const CastRow: React.FC<{ details: TitleDetails | null }> = ({ details }) => {
  const openPerson = useOpenPerson();
  const people = React.useMemo(() => {
    if (!details) return [] as { person: PersonCredit; line: string }[];
    const list = [
      ...(details.cast ?? []).slice(0, 20).map((c) => ({ person: c, line: c.role || '' })),
      ...(details.creators ?? []).map((c) => ({ person: c, line: 'Creator' })),
      ...(details.directors ?? []).map((c) => ({ person: c, line: 'Director' })),
    ];
    const seen = new Set<string>();
    return list.filter((e) => { const k = `${e.person.id ?? e.person.name}|${e.line}`; if (seen.has(k)) return false; seen.add(k); return true; });
  }, [details]);
  if (!people.length) return null;
  return (
    <section className="mb-6 text-left" data-tv-section="">
      <h2 className="mb-3 text-[20px] font-semibold text-slate-100">Cast & crew</h2>
      <div className="hide-scrollbar flex gap-5 overflow-x-auto" data-tv-group="row">
        {people.map(({ person, line }, i) => {
          const photo = urlOf(person.photo);
          return (
            <div key={i} className="w-[100px] shrink-0 text-center">
              <button
                type="button"
                onClick={() => { if (person.id && openPerson) openPerson(person.id); }}
                data-focusable="true"
                tabIndex={-1}
                className="tv-card mx-auto block h-[88px] w-[88px] overflow-hidden rounded-full bg-[#121A2B]"
              >
                {photo ? <img src={photo} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span className="text-2xl font-bold text-white/40">{person.name.charAt(0)}</span>}
              </button>
              <p className="tv-card-caption mt-2 truncate text-[12px] font-semibold text-slate-200">{person.name}</p>
              {line && <p className="line-clamp-2 text-[12px] text-slate-500">{line}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
};

/** More Like This: posters, as Home's rows. */
const MoreLikeRow: React.FC<{ contentId: string }> = ({ contentId }) => {
  const openTitle = useOpenTitle();
  const [items, setItems] = React.useState<MediaItem[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    setItems([]);
    if (!isContentId(contentId)) return;
    void getSimilar(contentId).then((list) => { if (!cancelled) setItems(list.filter((x) => String(x.id) !== contentId)); });
    return () => { cancelled = true; };
  }, [contentId]);
  if (!openTitle || !items.length) return null;
  return (
    <section className="mb-6 text-left" data-tv-section="">
      <h2 className="mb-3 text-[20px] font-semibold text-slate-100">More Like This</h2>
      <div className="hide-scrollbar flex gap-4 overflow-x-auto" data-tv-group="row">
        {items.map((m) => (
          <div key={String(m.id)} className="w-[130px] shrink-0">
            <MediaCard item={m} onClick={openTitle.open} isLoading={openTitle.loadingItemId === String(m.id)} />
          </div>
        ))}
      </div>
    </section>
  );
};

/** A trailer over everything; Back closes it. */
const Trailer: React.FC<{ youtubeKey: string; onClose: () => void }> = ({ youtubeKey, onClose }) => {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label="Trailer" className="fixed inset-0 z-[120] bg-black">
      <iframe title="Trailer" src={`https://www.youtube.com/embed/${encodeURIComponent(youtubeKey)}?autoplay=1&rel=0`} allow="autoplay; encrypted-media" className="h-full w-full border-0" />
      <button type="button" onClick={onClose} data-focusable="true" data-default-focus="true" tabIndex={-1} className="absolute right-8 top-6 rounded-[10px] bg-black/60 px-4 py-2 text-[15px] font-semibold text-white">Close</button>
    </div>
  );
};

/**
 * The page over the whole screen, header included (the Android TV app's title pages have none):
 * drawn on <body>, outside the app's layers, so nothing of the page under it scrolls with it.
 */
const TitleLayer: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  createPortal(<div className="fixed inset-0 z-[85] overflow-hidden bg-[#05080F]" data-tv-layer="">{children}</div>, document.body);

/** A movie: details and buttons, then its Cast and More Like This rows. */
export const TvMovieDetail: React.FC<{ item: MediaItem; onPlay: (item: MediaItem) => void; progressRecords?: ProgressRecord[] }> = ({ item, onPlay, progressRecords = [] }) => {
  const { details, contentId } = useDetails(item);
  const [trailer, setTrailer] = React.useState(false);
  const trailerKey = clean((item as any).trailer_key || (details as any)?.trailerKey);
  const record = progressRecords.find((r) => String(r.mediaId) === String(item.id));
  const resumeAt = record && !record.completed && record.progress > 2 ? record.progress : 0;
  return (
    <TitleLayer>
      <Backdrop item={item} />
      <div className="hide-scrollbar relative h-full overflow-y-auto px-12" data-tv-scroll="rows">
        <section className="flex min-h-[88%] flex-col justify-center pb-6 pt-10" data-tv-section="">
          <div className="w-[640px]">
            <Info item={item} details={details} credit="Directed by" overviewLines={4} />
          </div>
          <div className="mt-6 flex gap-3">
            <TvButton primary defaultFocus onClick={() => onPlay(item)}>
              <Play className="h-5 w-5 fill-current" /> {resumeAt ? `Resume · ${clock(resumeAt)}` : 'Play'}
            </TvButton>
            {trailerKey && <TvButton onClick={() => setTrailer(true)}><Film className="h-5 w-5" /> Trailer</TvButton>}
            <MyListToggle contentId={contentId} />
          </div>
        </section>
        <CastRow details={details} />
        <MoreLikeRow contentId={contentId} />
        <div className="h-[300px]" aria-hidden="true" />
      </div>
      {trailer && trailerKey && <Trailer youtubeKey={trailerKey} onClose={() => setTrailer(false)} />}
    </TitleLayer>
  );
};

const seasonLabel = (season: MediaItem, index: number) => {
  const raw = season.title || season.name || '';
  const num = season.number ?? raw.match(/^\D*(\d+)/)?.[1];
  return `Season ${num || index + 1}`;
};

/** One episode: number, a 16:9 still, the title, runtime and air date, the overview. */
const EpisodeRow: React.FC<{ ep: MediaItem; index: number; seriesTitle?: string; progress?: number; watched?: boolean; isResume: boolean; onPlay: (ep: MediaItem) => void }> = ({ ep, index, seriesTitle, progress, watched, isResume, onPlay }) => {
  const still = urlOf(ep.screenshot_uri);
  const sub = [isResume ? '▶ Continue watching' : null, episodeRuntime(ep), episodeAirDate(ep, seriesTitle), watched ? 'Watched' : null].filter(Boolean).join('  ·  ');
  const overview = clean(ep.description);
  return (
    <button
      type="button"
      onClick={() => onPlay(ep)}
      data-focusable="true"
      data-default-focus={isResume ? 'true' : undefined}
      tabIndex={-1}
      className="flex w-full items-center gap-4 rounded-[14px] px-3 py-3 text-left"
    >
      <span className="w-8 shrink-0 text-center text-[20px] font-semibold text-slate-300">{episodeNumber(ep, index)}</span>
      <span className="relative aspect-video w-[150px] shrink-0 overflow-hidden rounded-md bg-[#121A2B]">
        {still && <img src={downsize(still, 'w300')} alt="" loading="lazy" className="h-full w-full object-cover" />}
        {progress !== undefined && progress > 0 && (
          <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/25"><span className="block h-full bg-sky-400" style={{ width: `${Math.min(100, progress)}%` }} /></span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[17px] font-semibold text-white">{episodeTitle(ep, index, seriesTitle)}</span>
        {sub && <span className="block truncate text-[13px] text-slate-400">{sub}</span>}
        {overview && <span className="mt-1 line-clamp-2 block text-[13px] leading-[1.45] text-slate-400">{overview}</span>}
      </span>
    </button>
  );
};

/** A series: details and buttons on the left; the season tabs and their episodes on the right. */
export const TvSeriesDetail: React.FC<{
  seriesItem: MediaItem;
  seasons: MediaItem[];
  loadingSeasons: boolean;
  progressRecords: ProgressRecord[];
  onPlayEpisode: (ep: MediaItem) => void;
}> = ({ seriesItem, seasons, loadingSeasons, progressRecords, onPlayEpisode }) => {
  const { details, contentId } = useDetails(seriesItem);
  const s = useSeasonEpisodes(seriesItem, seasons, progressRecords);
  const [pane, setPane] = React.useState<'episodes' | 'cast' | 'similar'>('episodes');
  const [trailer, setTrailer] = React.useState(false);
  const trailerKey = clean((seriesItem as any).trailer_key || (details as any)?.trailerKey);
  const seriesTitle = seriesItem.title || seriesItem.name;
  const resume = s.resumeEpisode;
  const resumeAt = Number(s.continueRecord?.meta?.currentTime) || Number(s.continueRecord?.progress) || 0;
  const firstEpisode = s.episodes[0];
  const playTarget = resume ?? firstEpisode;
  const seasonOf = (id: string | null) => { const i = seasons.findIndex((x) => String(x.id) === String(id)); return i < 0 ? 1 : Number(seasonLabel(seasons[i], i).replace('Season ', '')) || i + 1; };
  const playLabel = resume
    ? `Resume S${seasonOf(s.selectedSeasonId)}E${episodeNumber(resume, s.episodes.indexOf(resume))}${resumeAt > 2 ? ` · ${clock(resumeAt)}` : ''}`
    : firstEpisode ? `Play S${seasonOf(s.selectedSeasonId)}E${episodeNumber(firstEpisode, 0)}` : 'Play';
  const episodeCount = s.episodes.length;
  const listRef = React.useRef<HTMLDivElement>(null);

  // The episode list loads its next page as the remote nears its end.
  const onListFocus = (e: React.FocusEvent) => {
    const rows = listRef.current?.querySelectorAll('[data-focusable="true"]');
    if (!rows || !s.hasMoreEpisodes) return;
    const i = Array.prototype.indexOf.call(rows, e.target);
    if (i >= rows.length - 4) void s.loadMore();
  };

  return (
    <TitleLayer>
      <Backdrop item={seriesItem} />
      <div className="relative flex h-full gap-10 px-12 pt-10">
        <div className="hide-scrollbar flex w-[420px] shrink-0 flex-col justify-center overflow-y-auto pb-10">
          <Info item={seriesItem} details={details} credit="Created by" overviewLines={5} castLine extraMeta={[seasons.length ? `${seasons.length} season${seasons.length === 1 ? '' : 's'}` : '', episodeCount ? `${episodeCount}${s.hasMoreEpisodes ? '+' : ''} episodes` : ''].filter(Boolean)} />
          <div className="mt-6 flex flex-wrap gap-3">
            <TvButton primary defaultFocus={!resume} onClick={() => { if (playTarget) onPlayEpisode(playTarget); }}>
              <Play className="h-5 w-5 fill-current" /> {playLabel}
            </TvButton>
            <TvButton onClick={() => setPane(pane === 'cast' ? 'episodes' : 'cast')}><Users className="h-5 w-5" /> {pane === 'cast' ? 'Episodes' : 'Cast & crew'}</TvButton>
            <MyListToggle contentId={contentId} />
            <TvButton onClick={() => setPane(pane === 'similar' ? 'episodes' : 'similar')}><Layers className="h-5 w-5" /> {pane === 'similar' ? 'Episodes' : 'More Like This'}</TvButton>
            {trailerKey && <TvButton onClick={() => setTrailer(true)}><Film className="h-5 w-5" /> Trailer</TvButton>}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col pb-6">
          {pane === 'episodes' ? (
            <>
              <div className="hide-scrollbar -mx-2 flex shrink-0 gap-3 overflow-x-auto px-2 py-2" data-tv-group="seasons">
                {loadingSeasons && seasons.length === 0 && <span className="py-2 text-[15px] text-slate-400">Loading seasons…</span>}
                {seasons.map((season, i) => {
                  const active = String(season.id) === String(s.selectedSeasonId);
                  return (
                    <button
                      key={`${season.id}-${i}`}
                      type="button"
                      onClick={() => s.setSelectedSeasonId(season.id)}
                      data-focusable="true"
                      data-active={active ? 'true' : undefined}
                      tabIndex={-1}
                      className={`h-11 shrink-0 rounded-[10px] px-5 text-[16px] font-semibold ${active ? 'bg-sky-600 text-white' : 'bg-[#1E293B]/90 text-slate-200'}`}
                    >
                      {seasonLabel(season, i)}
                    </button>
                  );
                })}
              </div>
              <div ref={listRef} onFocus={onListFocus} className={`hide-scrollbar -mx-2 mt-2 min-h-0 flex-1 overflow-y-auto px-2 py-2 transition-opacity ${s.loadingEpisodes ? 'opacity-40' : ''}`}>
                {s.episodes.length === 0 && !s.loadingEpisodes && <p className="py-6 text-[15px] text-slate-400">No episodes in this season.</p>}
                {s.episodes.map((ep, i) => {
                  const rec = s.progressByMediaId.get(String(ep.id));
                  const isResume = s.resumeEpisode?.id === ep.id;
                  return (
                    <EpisodeRow
                      key={`${ep.id}-${i}`}
                      ep={ep}
                      index={i}
                      seriesTitle={seriesTitle}
                      isResume={isResume}
                      watched={rec?.completed}
                      progress={isResume ? Number(s.continueRecord?.meta?.progressPercent) || undefined : Number(rec?.meta?.progressPercent) || undefined}
                      onPlay={onPlayEpisode}
                    />
                  );
                })}
                {s.loadingMoreEpisodes && <p className="py-3 text-center text-[14px] text-slate-400">Loading…</p>}
              </div>
            </>
          ) : (
            <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto py-2" data-tv-scroll="rows">
              {pane === 'cast' ? <CastRow details={details} /> : <MoreLikeRow contentId={contentId} />}
            </div>
          )}
        </div>
      </div>
      {trailer && trailerKey && <Trailer youtubeKey={trailerKey} onClose={() => setTrailer(false)} />}
    </TitleLayer>
  );
};
