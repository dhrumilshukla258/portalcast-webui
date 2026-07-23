/* eslint-disable @typescript-eslint/no-explicit-any */

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user';

  preferences: {
    preferredContentType?: 'movie' | 'series' | 'tv';
    favorites?: string[];
    recentChannels?: string[];
    videoFitMode?: string;
    volume?: number;
    muted?: boolean;
    lastSelectedCategory?: Record<string, string>;
    lastSelectedCategoryTitle?: Record<string, string>;
    recentCategories?: Record<string, string[]>;
    pinnedCategories?: Record<string, string[]>;
    categoryOrder?: Record<string, string[]>;
    recentSearches?: string[];
    lastSelectedTvGroup?: Record<string, string>;
    lastSelectedTvChannel?: Record<string, string>;
  };
}

export interface ProgressRecord {
  userId?: number;
  mediaId: string;
  progress: number;
  completed: boolean;
  meta: Record<string, any>;
  updatedAt?: string;
}

export interface UpdatePreferencesResponse {
  success: boolean;
  preferences: User['preferences'];
}
