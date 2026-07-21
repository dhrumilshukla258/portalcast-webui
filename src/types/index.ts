export interface MediaItem {
  id: string;
  // Only set on Discover-sourced items (facets/browse/recommendations) —
  // "movie" | "series", used to resolve the real item via getMedia/getSeries
  // before opening a detail page (Discover ids are ContentMeta's prefixed
  // "movie_{rawId}"/"series_{rawId}" form, not a raw playable id).
  type?: 'movie' | 'series';
  // Discover-sourced items only — the real portal category this item was
  // enriched from (see server's discover/index.ts toMediaItem). Lets
  // openDiscoverItem resolve getMedia/getSeries against the actual category
  // instead of "*".
  category?: string;
  // Discover-sourced items only — ContentMeta's own prefixed id
  // ("movie_{id}"/"series_{id}"), preserved through openDiscoverItem's
  // resolve step so progress-saving can look this title back up in
  // ContentMeta later (e.g. for the "Because You Watched X" recommendation
  // row). Necessary because the item's own `.id` gets overwritten by the
  // portal's resolved file id at that point, which isn't a valid ContentMeta
  // lookup key — see VideoContext.tsx's saveProgress.
  catalogId?: string;
  title?: string;
  name?: string;
  screenshot_uri?: string;
  is_series?: number;
  is_season?: boolean | number;
  is_episode?: boolean | number;
  series_number?: number;
  is_playable_movie?: boolean;
  has_files?: number;
  cmd?: string;
  number?: number;
  tv_genre_id?: string;
  category_id?: string | number;
  series_id?: string;
  season_id?: string;
  is_continue_watching?: boolean;
  stream_icon?: string;
  num?: string | number;
  stream_id?: string | number;
  runtime?: number;
  duration?: number;
  progressPercent?: number;
  isPortal?: boolean;

  description?: string;
  director?: string;
  actors?: string;
  year?: string;
  rating_imdb?: string | number;
  rating_kinopoisk?: string | number;
  rating_mpaa?: string;
  age?: string;
  country?: string;
  genres_str?: string;
  enable_tv_archive?: number;
  tv_archive_duration?: string | number;
  episode_num?: number | string;
  // Any-resolution backdrop — used by the detail-page hero (MediaInfoHeader),
  // which would rather show a lower-res image than none.
  backdrop_path?: string;
  // High-res-only backdrop (only set when TMDB has one clearing the
  // resolution floor, see server's tmdb.ts) — used by AmbientBackdrop, which
  // skips an item entirely rather than show a soft/upscaled one.
  backdrop_hd_path?: string;
  trailer_key?: string;
}

export interface ContextType {
  page: number;
  pageAtaTime: number;
  search: string;
  category: string | null;
  movieId: string | null;
  seasonId: string | null;
  parentTitle: string;
  focusedIndex?: number | null;
  contentType: 'movie' | 'series' | 'tv';
  sort?: string;
}

export interface EPG_List {
  start_timestamp: string;
  stop_timestamp: string;
  name: string;
  description?: string;
}

export interface ChannelGroup {
  id: string;
  title: string;
}

export type HistoryState = {
  context: ContextType;
  items: MediaItem[];
  totalItemsCount: number;
  focusedIndex: number;
  currentSeriesItem: MediaItem | null;
};

export * from './video';
