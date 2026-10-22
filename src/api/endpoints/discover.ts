import { cachedGet } from '@/api/responseCache';
import { api } from '@/api/client';
import type { MediaItem, PaginatedResponse } from '@/api/types/channels';

export const DISCOVER_PATHS = {
  FACETS: '/v2/discover/facets',
  BROWSE: '/v2/discover/browse',
  ROWS: '/v2/discover/rows',
  RECOMMENDATIONS: '/v2/discover/recommendations',
  HOME: '/v2/home',
  VARIANTS: '/v2/discover/variants',
  PEOPLE: '/v2/people',
  PEOPLE_SEARCH: '/v2/search/people',
};

export interface FacetValue {
  value: string;
  count: number;
  /** Channel facets only: the channel's logo. */
  logo?: string;
}

export interface DiscoverFacets {
  genres: FacetValue[];
  countries: FacetValue[];
  themes: FacetValue[];
  languages: FacetValue[];
  /** TV channels shows air on (only ones in Live TV). Absent on older servers. */
  networks?: FacetValue[];
}

export interface DiscoverBrowseParams {
  type?: 'movie' | 'series';
  genre?: string;
  country?: string;
  language?: string;
  theme?: string;
  network?: string;
  page?: number;
  [key: string]: unknown;
}

export const getFacets = async (
  type?: 'movie' | 'series',
  signal?: AbortSignal
): Promise<DiscoverFacets> => {
  const response = (
    await cachedGet<DiscoverFacets>(DISCOVER_PATHS.FACETS, {
      params: type ? { type } : undefined,
      signal,
    })
  );
  if (!response) {
    throw new Error('No response data received from discover facets API.');
  }
  return response;
};

/** Several genre rows (first page each) in one request (servers from 2026-10-21). */
export const getDiscoverRows = async (
  genres: string[],
  type?: 'movie' | 'series'
): Promise<{ genre: string; data: MediaItem[]; total_items: number }[]> => {
  const response = await cachedGet<{ rows: { genre: string; data: MediaItem[]; total_items: number }[] }>(DISCOVER_PATHS.ROWS, {
    params: { genres: genres.join(','), type } as Record<string, unknown>,
  });
  if (!response?.rows) throw new Error('No rows in discover rows answer.');
  return response.rows;
};

export const getDiscoverBrowse = async (
  params: DiscoverBrowseParams,
  signal?: AbortSignal
): Promise<PaginatedResponse<MediaItem>> => {
  const response = (
    await cachedGet<PaginatedResponse<MediaItem>>(DISCOVER_PATHS.BROWSE, {
      params: params as Record<string, unknown>,
      signal,
    })
  );
  if (!response) {
    throw new Error('No response data received from discover browse API.');
  }
  return response;
};

export interface RecommendationsResult {
  items: MediaItem[];
  basedOnTitle: string | null;
}

export const getRecommendations = async (
  type?: 'movie' | 'series',
  signal?: AbortSignal
): Promise<RecommendationsResult> => {
  const response = (
    await cachedGet<{ data: MediaItem[]; basedOnTitle?: string | null }>(DISCOVER_PATHS.RECOMMENDATIONS, {
      params: type ? { type } : undefined,
      signal,
    })
  );
  return { items: response?.data || [], basedOnTitle: response?.basedOnTitle ?? null };
};

/** One of the viewer's personal rows, prepared on the server (GET /api/v2/home). */
export interface HomeRow {
  key: string;
  kind: 'because' | 'picks' | 'person' | 'popular' | string;
  title: string;
  data: MediaItem[];
}

export interface HomeResult {
  rows: HomeRow[];
  /** The viewer's genres, most watched first: the order of the genre rows. */
  genreOrder: string[];
}

/** The viewer's prepared rows (servers from 2026-10-22; older ones answer 404). */
export const getHome = async (type?: 'movie' | 'series', signal?: AbortSignal): Promise<HomeResult> => {
  const response = await cachedGet<HomeResult>(DISCOVER_PATHS.HOME, { params: type ? { type } : undefined, signal });
  if (!response?.rows) throw new Error('No rows in home answer.');
  return { rows: response.rows, genreOrder: response.genreOrder ?? [] };
};

export interface DiscoverVariant extends MediaItem {
  // Best-effort language/format label for this specific variant (e.g. "Tamil",
  // "Hindi" — resolved server-side from the portal's own naming conventions,
  // including quirks like "South Dub" actually meaning Hindi audio).
  variantLabel: string;
}

// A Discover card can represent more than one underlying catalog entry (the
// same title dubbed/subtitled differently, e.g. "ABC Tamil"/"ABC South Dub").
// Called on click to check whether a variant picker is needed before opening
// a detail page directly.
export const getDiscoverVariants = async (id: string, signal?: AbortSignal): Promise<DiscoverVariant[]> => {
  const response = (
    await cachedGet<{ variants: DiscoverVariant[] }>(DISCOVER_PATHS.VARIANTS, {
      params: { id },
      signal,
    })
  );
  return response?.variants || [];
};

export interface PersonCredit {
  name: string;
  role: string | null;
  photo: string | null;
  /** Opens the person's page (servers from 2026-10-21). */
  id?: number | null;
}

/** Detail-page data (servers from 2026-10-21): tagline, age rating, studios, logo, cast with photos. */
export interface TitleDetails {
  tagline: string | null;
  ageRating: string | null;
  runtime: number | null;
  studios: string | null;
  collection: string | null;
  originalTitle: string | null;
  premiered: string | null;
  writers: string | null;
  logo: string | null;
  cast: PersonCredit[];
  directors: PersonCredit[];
  creators: PersonCredit[];
  writersPeople?: PersonCredit[];
}

/** By content id ("movie_123"), or type + the catalog id the app browses by. */
export const getTitleDetails = async (params: { id?: string; type?: 'movie' | 'series'; raw?: string }): Promise<TitleDetails | null> => {
  try {
    return (await api.get<TitleDetails>('/v2/discover/details', { params })).data ?? null;
  } catch {
    return null; // older server: the page shows what the card carried
  }
};

/** `GET /api/v2/people/{id}`: who the person is. */
export interface PersonInfo {
  id: number;
  name: string;
  photo: string | null;
  biography: string | null;
  knownFor: string | null;
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
}

/** How the person worked on a title: kind (cast, director, writer, creator) and character or job. */
export interface CreditRole {
  kind: string;
  role: string | null;
}

/** A person's page: details and every title of theirs in the catalog (Discover cards, newest first). */
export interface PersonPage {
  person: PersonInfo;
  credits: (MediaItem & { roles?: CreditRole[] })[];
}

export const getPerson = async (id: number, signal?: AbortSignal): Promise<PersonPage> =>
  (await api.get<PersonPage>(`${DISCOVER_PATHS.PEOPLE}/${id}`, { signal })).data;

/** One person found by name (`GET /api/v2/search/people`). */
export interface PersonHit {
  id: number;
  name: string;
  photo: string | null;
  /** "Actor", "Director", "Actor · Director"... */
  knownFor: string;
  /** Titles they lead in the catalog. */
  titles: number;
}

export interface PeopleSearchResult {
  people: PersonHit[];
  /** The person the query clearly names, with their best-known titles. */
  featured: { id: number; name: string; credits: MediaItem[]; total: number } | null;
  ready: boolean;
}

/** People by name, answered from the server's memory; cached here like other searches. */
export const searchPeople = async (q: string, signal?: AbortSignal): Promise<PeopleSearchResult> =>
  (await cachedGet<PeopleSearchResult>(DISCOVER_PATHS.PEOPLE_SEARCH, { params: { q }, signal })) ?? { people: [], featured: null, ready: false };

/** `GET /api/v2/discover/similar?id=movie_123`: More Like This (servers from 2026-10-22; empty before). */
export const getSimilar = async (id: string): Promise<MediaItem[]> => {
  try {
    return (await api.get<{ data: MediaItem[] }>('/v2/discover/similar', { params: { id } })).data?.data ?? [];
  } catch {
    return [];
  }
};

/**
 * My List (servers from 2026-10-22): the viewer's saved titles. `getMyListIds` answers null
 * when the server has no My List, and the button is then not shown.
 */
export const getMyList = async (): Promise<MediaItem[]> =>
  (await api.get<{ data: MediaItem[] }>('/user/list')).data?.data ?? [];

export const getMyListIds = async (): Promise<Set<string> | null> => {
  try {
    return new Set((await api.get<{ ids: string[] }>('/user/list/ids')).data?.ids ?? []);
  } catch {
    return null;
  }
};

export const setInMyList = async (id: string, inList: boolean): Promise<void> => {
  const path = `/user/list/${encodeURIComponent(id)}`;
  if (inList) await api.put(path);
  else await api.delete(path);
};
