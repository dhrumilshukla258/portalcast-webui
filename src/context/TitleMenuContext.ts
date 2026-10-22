import React from 'react';
import type { MediaItem } from '@/types';

export interface TitleMenuExtra {
  /** Continue Watching cards: "Remove from Continue Watching". */
  onRemoveFromContinue?: () => void;
}

/** Opens the title menu (hold / right-click / ⋯ on a card; App renders it). */
export const TitleMenuContext = React.createContext<((item: MediaItem, extra?: TitleMenuExtra) => void) | null>(null);
export const useTitleMenu = () => React.useContext(TitleMenuContext);
