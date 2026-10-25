import { createContext, useContext } from 'react';
import type { MediaItem } from '@/types';

/** Home's hero follows the focused card (TV apps): cards in its rows report the title they show. */
export const TvFocusedItemContext = createContext<((item: MediaItem) => void) | null>(null);

export const useTvFocusedItem = () => useContext(TvFocusedItemContext);
