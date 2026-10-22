import React from 'react';

/**
 * Opens a person's page (cast or crew) from anywhere below TVPortal, so the detail
 * header does not need the callback threaded through every browse component.
 * Null outside TVPortal: people are then shown, not clickable.
 */
export const PersonPageContext = React.createContext<((id: number) => void) | null>(null);

export const useOpenPerson = () => React.useContext(PersonPageContext);

/**
 * Opens a Discover card (`movie_123` / `series_45`) from below TVPortal, the way Discover does:
 * the version picker when there are several, then the detail page. Used by More Like This.
 * Null outside TVPortal: the row is then not shown.
 */
export interface OpenTitle {
  open: (item: import('@/types').MediaItem) => void;
  /** The card whose open is in flight (its spinner). */
  loadingItemId: string | null;
}
export const OpenTitleContext = React.createContext<OpenTitle | null>(null);

export const useOpenTitle = () => React.useContext(OpenTitleContext);
