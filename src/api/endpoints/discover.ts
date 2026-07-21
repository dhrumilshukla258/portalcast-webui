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
}

export interface DiscoverFacets {
  genres: FacetValue[];
  countries: FacetValue[];
  themes: FacetValue[];
  languages: FacetValue[];
}

export interface DiscoverBrowseParams {
  type?: 'movie' | 'series';
  genre?: string;
  country?: string;
  language?: string;
  theme?: string;
  page?: number;
  [key: string]: unknown;
}

export const getFacets = async (
  type?: 'movie' | 'series',
  signal?: AbortSignal
): Promise<DiscoverFacets> => {
  const response = (
    await api.get<DiscoverFacets>(DISCOVER_PATHS.FACETS, {
      params: type ? { type } : undefined,
      signal,
    })
  ).data;
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
    await api.get<PaginatedResponse<MediaItem>>(DISCOVER_PATHS.BROWSE, {
      params,
      signal,
    })
  ).data;
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
    await api.get<{ data: MediaItem[]; basedOnTitle?: string | null }>(DISCOVER_PATHS.RECOMMENDATIONS, {
      params: type ? { type } : undefined,
      signal,
    })
  ).data;
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
    await api.get<{ variants: DiscoverVariant[] }>(DISCOVER_PATHS.VARIANTS, {
      params: { id },
      signal,
    })
  ).data;
  return response?.variants || [];
};
