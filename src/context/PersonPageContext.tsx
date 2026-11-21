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
  /** Opens that exact title's page, no version picker (Continue Watching: the version being watched). */
  openPage: (item: import('@/types').MediaItem) => Promise<void>;
  /** Plays another version of the movie playing (a Discover variant), from `at` seconds. */
  playVersion: (version: import('@/types').MediaItem, at: number) => Promise<void>;
  /** The card whose open is in flight (its spinner). */
  loadingItemId: string | null;
}
export const OpenTitleContext = React.createContext<OpenTitle | null>(null);

/** Opens Movies (or Shows) filtered to one genre: a genre on a title's page. Null: not clickable. */
export const OpenGenreContext = React.createContext<((genre: string, type: 'movie' | 'series') => void) | null>(null);
export const useOpenGenre = () => React.useContext(OpenGenreContext);

export const useOpenTitle = () => React.useContext(OpenTitleContext);
