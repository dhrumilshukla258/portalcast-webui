import { useCallback, useEffect } from 'react';
import type { MediaItem } from '@/types';

interface UseSearchControllerArgs {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  contextSearch: string | null;
  pushFrame: () => void;
  handleSearch: (search: string) => void;
  setDetailItem: (item: MediaItem | null) => void;
  recentSearches: string[];
  updatePreferences: (prefs: Record<string, unknown>) => void;
  isTizen: boolean;
}

// onSearchSubmit + the two effects below are one feedback loop and stay
// together: the debounce effect auto-submits as the user types, and the
// sync effect mirrors context.search back into the input whenever it
// changes for a reason OTHER than typing (e.g. Back restoring a pre-search
// context) — splitting either one out on its own reintroduces the stale-
// resubmit bug described inline below.
export function useSearchController({
  searchTerm,
  setSearchTerm,
  contextSearch,
  pushFrame,
  handleSearch,
  setDetailItem,
  recentSearches,
  updatePreferences,
  isTizen,
}: UseSearchControllerArgs) {
  const onSearchSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (searchTerm !== contextSearch) {
        pushFrame();
      }
      setDetailItem(null);
      handleSearch(searchTerm);

      const trimmed = searchTerm.trim();
      if (trimmed) {
        const deduped = [trimmed, ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
        updatePreferences({ recentSearches: deduped });
      }
    },
    [searchTerm, contextSearch, pushFrame, handleSearch, setDetailItem, recentSearches, updatePreferences]
  );

  const onSelectRecentSearch = useCallback(
    (term: string) => {
      setSearchTerm(term);
      if (term !== contextSearch) {
        pushFrame();
      }
      setDetailItem(null);
      handleSearch(term);
    },
    [setSearchTerm, contextSearch, pushFrame, handleSearch, setDetailItem]
  );

  const onRemoveRecentSearch = useCallback(
    (term: string) => {
      updatePreferences({
        recentSearches: recentSearches.filter((s) => s !== term),
      });
    },
    [recentSearches, updatePreferences]
  );

  // Auto-search as the user types (debounced) instead of requiring Enter —
  // skipped on Tizen, where searchTerm is driven by an on-screen remote
  // keyboard and each keystroke is already a deliberate remote click; forcing
  // a submit there too would refetch on every single button press.
  useEffect(() => {
    if (isTizen || searchTerm === (contextSearch || '')) return;
    const timer = setTimeout(() => onSearchSubmit(), 450);
    return () => clearTimeout(timer);
  }, [searchTerm, isTizen, contextSearch, onSearchSubmit]);

  // Keep the search box in sync when `context.search` changes for a reason
  // OTHER than the user typing — e.g. pressing Back restores a pre-search
  // context (context.search reverts), but nothing ever cleared the input box
  // itself, so it still held the old query. That mismatch is exactly what
  // the debounce effect above watches for, so it fired again ~450ms later
  // and re-submitted the stale search — silently undoing the "back" and
  // landing right back on the search results. This effect closes that loop:
  // whenever context.search moves out from under the input (any navigation,
  // not just Back), mirror it into the box so the debounce effect sees them
  // as already equal and does nothing.
  useEffect(() => {
    setSearchTerm(contextSearch || '');
  }, [contextSearch, setSearchTerm]);

  return { onSearchSubmit, onSelectRecentSearch, onRemoveRecentSearch };
}
