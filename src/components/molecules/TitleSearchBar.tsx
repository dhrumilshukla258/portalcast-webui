import React, { useState, useRef, useEffect } from 'react';

export interface TitleSearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  handleSearch: (e?: React.FormEvent<HTMLFormElement>) => void;
  isSearchActive: boolean;
  setIsSearchActive: (active: boolean) => void;
  isSearchTyping: boolean;
  setIsSearchTyping: (typing: boolean) => void;
  isTizen: boolean;
  recentSearches?: string[];
  onSelectRecentSearch?: (term: string) => void;
  onRemoveRecentSearch?: (term: string) => void;
  placeholder?: string;
}

// Moved out of Header (where it used to sit inline in the top nav row) into
// its own sticky sub-bar below Discover/Movies/Series/TV — mirroring how
// DiscoverView's own Filters/Movies/Series bar sits below that same nav row,
// so Movies/Series/TV get an equivalent "section bar" instead of search
// being buried in the header's action-controls cluster.
export const TitleSearchBar: React.FC<TitleSearchBarProps> = ({
  searchTerm,
  setSearchTerm,
  handleSearch,
  isSearchActive,
  setIsSearchActive,
  isSearchTyping,
  setIsSearchTyping,
  isTizen,
  recentSearches = [],
  onSelectRecentSearch,
  onRemoveRecentSearch,
  placeholder = 'Search titles...',
}) => {
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const searchContainerRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowRecentSearches(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    // z-45, not z-30 — TvChannelList (contentType 'tv') renders its own
    // panel at z-40; without this, that panel painted on top of this bar
    // (and its recent-searches dropdown) whenever the TV section was active,
    // since neither Movies nor Series have anything at a competing z-index.
    <div className="sticky top-0 z-45 mb-4 flex items-center rounded-2xl bg-black/80 px-2 py-2">
      <form
        onSubmit={(e) => {
          handleSearch(e);
          setShowRecentSearches(false);
        }}
        className="w-full"
        ref={searchContainerRef}
      >
        <div className="relative w-full">
          <input
            type="search"
            name="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={placeholder}
            className={`w-full rounded-full border border-white/10 bg-[#0b1120]/85 px-4 py-2 ${searchTerm ? 'pr-16' : 'pr-10'} text-sm text-gray-200 placeholder-gray-500 shadow-xs transition-all duration-300 focus:bg-white/5 focus:outline-hidden focus:ring-1 focus:ring-portalcast-light sm:text-base`}
            data-focusable="true"
            readOnly={isTizen ? !isSearchActive : !isSearchTyping}
            onClick={() => {
              if (isTizen) setIsSearchActive(true);
              if (!isTizen) setIsSearchTyping(true);
              setShowRecentSearches(true);
            }}
            onBlur={() => {
              if (isTizen) setIsSearchActive(false);
              setIsSearchTyping(false);
            }}
            onKeyDown={(e) => {
              if (isSearchTyping && e.key === 'Enter') {
                handleSearch();
                setShowRecentSearches(false);
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
          {showRecentSearches && !searchTerm && recentSearches.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-45 mt-2 overflow-hidden rounded-xl border border-white/10 bg-black/85 shadow-xl">
              <div className="flex items-center justify-between px-3 pt-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Recent Searches
              </div>
              {recentSearches.map((term) => (
                <div
                  key={term}
                  className="group flex items-center justify-between px-3 py-2 text-sm text-gray-200 hover:bg-white/5"
                >
                  <button
                    type="button"
                    data-focusable="true"
                    className="flex flex-1 items-center gap-2 truncate text-left"
                    onClick={() => {
                      onSelectRecentSearch?.(term);
                      setShowRecentSearches(false);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="truncate">{term}</span>
                  </button>
                  <button
                    type="button"
                    data-focusable="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveRecentSearch?.(term);
                    }}
                    className="ml-2 shrink-0 text-gray-500 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
                    aria-label={`Remove "${term}" from recent searches`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-8 flex items-center pr-1 text-gray-500 transition-colors duration-200 hover:text-white"
              aria-label="Clear search"
              data-focusable="true"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <button type="submit" className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors duration-200 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default TitleSearchBar;
