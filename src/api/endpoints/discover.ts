import { cachedGet } from '@/api/responseCache';
import { api } from '@/api/client';
import type { MediaItem, PaginatedResponse } from '@/api/types/channels';

export const DISCOVER_PATHS = {
  FACETS: '/v2/discover/facets',
  BROWSE: '/v2/discover/browse',
  RECOMMENDATIONS: '/v2/discover/recommendations',
  VARIANTS: '/v2/discover/variants',
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
}

/** By content id ("movie_123"), or type + the catalog id the app browses by. */
export const getTitleDetails = async (params: { id?: string; type?: 'movie' | 'series'; raw?: string }): Promise<TitleDetails | null> => {
  try {
    return (await api.get<TitleDetails>('/v2/discover/details', { params })).data ?? null;
  } catch {
    return null; // older server: the page shows what the card carried
  }
};
