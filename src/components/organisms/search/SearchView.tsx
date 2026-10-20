import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search as SearchIcon, X, Tv } from 'lucide-react';
import type { MediaItem } from '@/types';
import { getMedia } from '@/api/endpoints/movies';
import { getSeries } from '@/api/endpoints/series';
import { getChannels } from '@/api/endpoints/channels';
import { URL_PATHS } from '@/api/config';
import MediaCard from '@/components/molecules/MediaCard';
import { cleanRecentSearches } from '@/hooks/useSearchController';

/**
 * Global search — the same as the TV app's Search tab: one query across ALL movie and
 * series categories (server-side, `category=*&search=`, answered from the server's cache)
 * plus live channels (matched here over the channel list), with All / Movies / Series /
 * Live TV tabs and recent searches. A title's language/quality versions ("ABC Hindi",
 * "ABC Tamil 4K") are one result, grouped by the server's `title_key`; opening a result
 * with several versions asks which one.
 */

type Filter = 'all' | 'movies' | 'series' | 'live';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'movies', label: 'Movies' },
  { key: 'series', label: 'Series' },
  { key: 'live', label: 'Live TV' },
];
const MIN_CHARS = 2;
const DEBOUNCE_MS = 400;
const MAX_CHANNELS = 60;
const ALL_TAB_CHANNELS = 5;
const ALL_TAB_TITLES = 18;

export interface TitleGroup {
  key: string;
  title: string;
  variants: MediaItem[];
}

interface Section {
  groups: TitleGroup[];
  rawLoaded: number;
  total: number;
  nextPage: number;
  loadingMore: boolean;
}
const EMPTY: Section = { groups: [], rawLoaded: 0, total: 0, nextPage: 2, loadingMore: false };

/** Adds items to existing groups, first-seen order; later pages can add versions to a shown title. */
function group(existing: TitleGroup[], items: MediaItem[]): TitleGroup[] {
  const byKey = new Map<string, TitleGroup>();
  for (const g of existing) byKey.set(g.key, g);
  for (const item of items) {
    const raw = String(item.title || item.name || '');
    const key = item.title_key || raw.trim().toLowerCase();
    const g = byKey.get(key);
    if (!g) byKey.set(key, { key, title: item.clean_name || raw, variants: [item] });
    else if (!g.variants.some((v) => v.id === item.id)) byKey.set(key, { ...g, variants: [...g.variants, item] });
  }
  return [...byKey.values()];
}

let channelCache: Promise<MediaItem[]> | null = null;
function allChannels(): Promise<MediaItem[]> {
  if (!channelCache) {
    channelCache = getChannels().then((r) => r.data).catch((e) => { channelCache = null; throw e; });
  }
  return channelCache;
}

function matchChannels(all: MediaItem[], query: string): MediaItem[] {
  const q = query.trim().toLowerCase();
  const number = /^\d+$/.test(q) ? Number(q) : null;
  const out: MediaItem[] = [];
  for (const c of all) {
    if ((number !== null && Number(c.number) === number) || String(c.name || '').toLowerCase().includes(q)) {
      out.push(c);
      if (out.length >= MAX_CHANNELS) break;
    }
  }
  return out;
}

interface SearchViewProps {
  recentSearches: string[];
  onRecentSearchesChange: (list: string[]) => void;
  /** One version: open it (isSeries says which page). */
  onOpenTitle: (item: MediaItem, isSeries: boolean) => void;
  /** Several versions: ask which one. */
  onPickVersion: (display: MediaItem, versions: MediaItem[], isSeries: boolean) => void;
  onPlayChannel: (channel: MediaItem) => void;
  /** Samsung TV browser: the field only takes typing after it is pressed (else its keyboard traps the remote). */
  isTizen?: boolean;
}

const SearchView: React.FC<SearchViewProps> = ({ recentSearches, onRecentSearchesChange, onOpenTitle, onPickVersion, onPlayChannel, isTizen = false }) => {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [movies, setMovies] = useState<Section>(EMPTY);
  const [series, setSeries] = useState<Section>(EMPTY);
  const [channels, setChannels] = useState<MediaItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);

  const [typing, setTyping] = useState(!isTizen);
  useEffect(() => { if (!isTizen) inputRef.current?.focus(); }, [isTizen]);

  const remember = useCallback((term: string) => {
    const t = term.trim();
    if (t.length < MIN_CHARS) return;
    const next = cleanRecentSearches([t, ...recentSearches]);
    if (next.join('\u0000') !== recentSearches.join('\u0000')) onRecentSearchesChange(next);
  }, [recentSearches, onRecentSearchesChange]);

  const run = useCallback(async (term: string) => {
    const q = term.trim();
    const id = ++requestRef.current;
    if (q.length < MIN_CHARS) { setSearched(null); setLoading(false); return; }
    setLoading(true);
    setError(false);
    const [m, s, c] = await Promise.allSettled([
      getMedia({ category: '*', search: q, page: 1 }),
      getSeries({ category: '*', search: q, page: 1 }),
      allChannels().then((all) => matchChannels(all, q)),
    ]);
    if (requestRef.current !== id) return; // superseded by a newer query
    const section = (r: PromiseSettledResult<{ data: MediaItem[]; total_items?: number }>): Section =>
      r.status === 'fulfilled'
        ? { ...EMPTY, groups: group([], r.value.data || []), rawLoaded: (r.value.data || []).length, total: r.value.total_items ?? (r.value.data || []).length }
        : EMPTY;
    setMovies(section(m));
    setSeries(section(s));
    setChannels(c.status === 'fulfilled' ? c.value : []);
    setError(m.status === 'rejected' && s.status === 'rejected');
    setSearched(q);
    setLoading(false);
  }, []);

  // Search as you type (debounced); only an explicit choice (Enter, a result, a recent
  // search) is remembered, so recent searches never fill with fragments.
  useEffect(() => {
    const t = setTimeout(() => run(query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, run]);

  const loadMore = useCallback(async (kind: 'movies' | 'series') => {
    const sec = kind === 'movies' ? movies : series;
    const set = kind === 'movies' ? setMovies : setSeries;
    if (!searched || sec.loadingMore || sec.rawLoaded >= sec.total) return;
    set((p) => ({ ...p, loadingMore: true }));
    try {
      const fetcher = kind === 'movies' ? getMedia : getSeries;
      const res = await fetcher({ category: '*', search: searched, page: sec.nextPage });
      const data = res.data || [];
      set((p) => ({
        groups: group(p.groups, data),
        rawLoaded: p.rawLoaded + data.length,
        total: data.length === 0 ? p.rawLoaded : res.total_items ?? p.total,
        nextPage: p.nextPage + 1,
        loadingMore: false,
      }));
    } catch {
      set((p) => ({ ...p, loadingMore: false }));
    }
  }, [movies, series, searched]);

  const open = useCallback((g: TitleGroup, isSeries: boolean) => {
    remember(query);
    const display = { ...g.variants[0], title: g.title, name: g.title };
    if (g.variants.length === 1) onOpenTitle(g.variants[0], isSeries);
    else onPickVersion(display, g.variants, isSeries);
  }, [query, remember, onOpenTitle, onPickVersion]);

  const play = useCallback((c: MediaItem) => { remember(query); onPlayChannel(c); }, [query, remember, onPlayChannel]);

  const empty = searched !== null && !loading && movies.groups.length === 0 && series.groups.length === 0 && channels.length === 0;

  return (
    <div id="app-content-scroll" className="custom-scrollbar h-full min-h-0 flex-1 overflow-y-auto px-2 sm:px-0">
      <div className="sticky top-0 z-30 mb-4 rounded-2xl bg-black/80 px-2 py-2">
        <form
          onSubmit={(e) => { e.preventDefault(); remember(query); run(query); }}
          className="relative"
        >
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            readOnly={!typing}
            onClick={() => { if (isTizen) setTyping(true); }}
            onBlur={() => { if (isTizen) setTyping(false); }}
            placeholder="Search movies, series and channels"
            data-focusable="true"
            className="w-full rounded-full border border-white/10 bg-[#0b1120]/85 py-2.5 pl-10 pr-10 text-base text-gray-100 placeholder-gray-500 focus:outline-hidden focus:ring-1 focus:ring-portalcast-light"
          />
          {query && (
            <button type="button" aria-label="Clear" onClick={() => { setQuery(''); inputRef.current?.focus(); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
        <div className="mt-2 flex flex-wrap items-center gap-2" data-focus-group="search-filters">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              data-focusable="true"
              onClick={() => setFilter(f.key)}
              className={`h-9 rounded-full border px-4 text-sm font-bold transition-all focus:outline-hidden focus:ring-1 focus:ring-portalcast-light [&.focused]:ring-1 [&.focused]:ring-portalcast-light ${
                filter === f.key ? 'border-transparent bg-linear-to-r from-sky-400 to-blue-500 text-white' : 'border-white/10 bg-[#0b1120]/85 text-gray-300 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
          {loading && <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
        </div>
      </div>

      {searched === null ? (
        <RecentSearches
          recent={recentSearches}
          onPick={(t) => { setQuery(t); run(t); }}
          onRemove={(t) => onRecentSearchesChange(recentSearches.filter((s) => s !== t))}
        />
      ) : error ? (
        <p className="py-10 text-center text-gray-400">Search failed. Check the connection and try again.</p>
      ) : empty ? (
        <p className="py-10 text-center text-gray-400">Nothing found for "{searched}".</p>
      ) : (
        <div className="flex flex-col gap-8 pb-10">
          {(filter === 'all' || filter === 'movies') && movies.groups.length > 0 && (
            <TitleResults title="Movies" section={movies} limit={filter === 'all' ? ALL_TAB_TITLES : undefined} onOpen={(g) => open(g, false)} onMore={() => (filter === 'all' ? setFilter('movies') : loadMore('movies'))} />
          )}
          {(filter === 'all' || filter === 'series') && series.groups.length > 0 && (
            <TitleResults title="Series" section={series} limit={filter === 'all' ? ALL_TAB_TITLES : undefined} onOpen={(g) => open(g, true)} onMore={() => (filter === 'all' ? setFilter('series') : loadMore('series'))} />
          )}
          {(filter === 'all' || filter === 'live') && channels.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold text-white">Live TV · {channels.length}{channels.length >= MAX_CHANNELS ? '+' : ''}</h2>
              <div className="flex flex-col gap-2">
                {(filter === 'all' ? channels.slice(0, ALL_TAB_CHANNELS) : channels).map((c) => <ChannelRow key={String(c.id)} channel={c} onPlay={play} />)}
              </div>
              {filter === 'all' && channels.length > ALL_TAB_CHANNELS && (
                <button data-focusable="true" onClick={() => setFilter('live')} className="mt-3 text-sm font-bold text-sky-400 hover:text-sky-300">All channels →</button>
              )}
            </section>
          )}
          {filter !== 'all' && ((filter === 'movies' && movies.groups.length === 0) || (filter === 'series' && series.groups.length === 0) || (filter === 'live' && channels.length === 0)) && (
            <p className="py-10 text-center text-gray-400">No {FILTERS.find((f) => f.key === filter)?.label.toLowerCase()} for "{searched}".</p>
          )}
        </div>
      )}
    </div>
  );
};

const TitleResults: React.FC<{
  title: string;
  section: Section;
  limit?: number;
  onOpen: (g: TitleGroup) => void;
  onMore: () => void;
}> = ({ title, section, limit, onOpen, onMore }) => {
  const shown = limit ? section.groups.slice(0, limit) : section.groups;
  const hasMore = section.rawLoaded < section.total || (limit !== undefined && section.groups.length > limit);
  const cards = useMemo(
    () => shown.map((g) => ({ g, item: { ...g.variants[0], title: g.title, name: g.title } as MediaItem })),
    [shown],
  );
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-white">
        {title} · {section.groups.length}{section.rawLoaded < section.total ? '+' : ''}
      </h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 md:gap-6 lg:grid-cols-6 xl:grid-cols-7">
        {cards.map(({ g, item }) => (
          <MediaCard
            key={g.key}
            item={item}
            onClick={() => onOpen(g)}
            categoryLabel={g.variants.length > 1 ? `${g.variants.length} versions` : item.year}
          />
        ))}
      </div>
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            data-focusable="true"
            onClick={onMore}
            disabled={section.loadingMore}
            className="rounded-full border border-white/10 px-5 py-2 text-sm font-bold text-gray-200 hover:bg-white/10 disabled:opacity-50"
          >
            {section.loadingMore ? 'Loading…' : limit ? `All ${title.toLowerCase()} →` : 'Load more'}
          </button>
        </div>
      )}
    </section>
  );
};

const ChannelRow: React.FC<{ channel: MediaItem; onPlay: (c: MediaItem) => void }> = ({ channel, onPlay }) => {
  const [failed, setFailed] = useState(false);
  const baseUrl = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
  const logo = channel.screenshot_uri || channel.stream_icon;
  const src = logo ? (logo.startsWith('http') ? logo : `${baseUrl}/api/images${logo}`) : null;
  return (
    <button
      data-focusable="true"
      onClick={() => onPlay(channel)}
      className="flex w-full items-center gap-3 rounded-xl border border-transparent bg-white/5 px-3 py-2 text-left transition-colors hover:bg-white/10 focus:border-white/80 focus:outline-hidden [&.focused]:border-white/80"
    >
      <span className="flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black/40">
        {src && !failed ? <img src={src} alt="" loading="lazy" className="max-h-full max-w-full object-contain" onError={() => setFailed(true)} /> : <Tv className="h-5 w-5 text-gray-500" />}
      </span>
      {channel.number !== undefined && <span className="w-10 shrink-0 text-sm font-bold text-gray-400">{channel.number}</span>}
      <span className="min-w-0 flex-1 truncate font-bold text-white">{channel.name}</span>
    </button>
  );
};

const RecentSearches: React.FC<{ recent: string[]; onPick: (t: string) => void; onRemove: (t: string) => void }> = ({ recent, onPick, onRemove }) => {
  if (recent.length === 0) {
    return <p className="py-10 text-center text-gray-500">Search all movies, series and live channels.</p>;
  }
  return (
    <section>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">Recent searches</h2>
      <div className="flex flex-wrap gap-2">
        {recent.map((t) => (
          <span key={t} className="flex items-center rounded-full border border-white/10 bg-[#0b1120]/85">
            <button data-focusable="true" onClick={() => onPick(t)} className="py-1.5 pl-4 pr-2 text-sm font-bold text-gray-200 hover:text-white">{t}</button>
            <button data-focusable="true" aria-label={`Remove ${t}`} onClick={() => onRemove(t)} className="py-1.5 pl-1 pr-3 text-gray-500 hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
    </section>
  );
};

export default SearchView;
