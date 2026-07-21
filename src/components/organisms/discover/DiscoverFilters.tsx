import React, { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import type { DiscoverFacets, DiscoverBrowseParams } from '@/api/endpoints/discover';

export type DiscoverFilterKey = 'genre' | 'country' | 'language' | 'theme';

interface DiscoverFiltersProps {
  facets: DiscoverFacets | null;
  activeFilters: Pick<DiscoverBrowseParams, DiscoverFilterKey>;
  onFilterChange: (key: DiscoverFilterKey, value: string | undefined) => void;
}

const DIMENSION_LABELS: Record<DiscoverFilterKey, string> = {
  genre: 'Genre',
  language: 'Language',
  country: 'Country',
  theme: 'Theme',
};

const DIMENSION_ORDER: DiscoverFilterKey[] = ['language', 'genre', 'country', 'theme'];

// TMDB's originalLanguage is an ISO 639-1 code (e.g. "hi", "ta") — display the
// full name instead of the raw code. Only holds overrides Intl.DisplayNames
// can't resolve correctly (non-standard/placeholder codes) — every real
// ISO 639-1 code is resolved generically below instead of hand-maintaining
// a list that will always be missing whatever code the catalog turns up next.
const LANGUAGE_NAME_OVERRIDES: Record<string, string> = {
  cn: 'Chinese', // TMDB non-standard alias for zh
  xx: 'No Language',
};

let languageDisplayNames: Intl.DisplayNames | undefined;
try {
  languageDisplayNames = new Intl.DisplayNames(['en'], { type: 'language' });
} catch {
  // Older TV browsers (e.g. Tizen webkit) may not implement Intl.DisplayNames —
  // fall back to the raw code (uppercased) below rather than crashing.
}

function languageName(code: string): string {
  const lower = code.toLowerCase();
  if (LANGUAGE_NAME_OVERRIDES[lower]) return LANGUAGE_NAME_OVERRIDES[lower];
  try {
    const name = languageDisplayNames?.of(lower);
    if (name && name.toLowerCase() !== lower) return name;
  } catch {
    // Intl.DisplayNames throws on a code it doesn't recognize as valid at all.
  }
  return code.toUpperCase();
}

function displayLabel(dimension: DiscoverFilterKey, value: string): string {
  return dimension === 'language' ? languageName(value) : value;
}

function valuesFor(facets: DiscoverFacets, dimension: DiscoverFilterKey) {
  switch (dimension) {
    case 'language': return facets.languages;
    case 'genre': return facets.genres;
    case 'country': return facets.countries;
    case 'theme': return facets.themes;
  }
}

// Top-level list: one row per dimension (Language/Genre/Country/Theme),
// showing its current selection — tapping drills into ValueList for that
// dimension instead of showing every value for every dimension at once.
const CategoryList: React.FC<{
  facets: DiscoverFacets;
  activeFilters: Pick<DiscoverBrowseParams, DiscoverFilterKey>;
  onOpenDimension: (dimension: DiscoverFilterKey) => void;
}> = ({ facets, activeFilters, onOpenDimension }) => (
  <div className="space-y-2">
    {DIMENSION_ORDER.filter((dim) => valuesFor(facets, dim).length > 0).map((dimension) => {
      const activeValue = activeFilters[dimension];
      return (
        <button
          key={dimension}
          data-focusable="true"
          onClick={() => onOpenDimension(dimension)}
          className="flex w-full items-center justify-between rounded-full border border-gray-800/80 bg-gray-900/40 px-4 py-3.5 text-left transition-all hover:border-gray-700 hover:bg-gray-800/50 focus:border-transparent focus:bg-gradient-to-r focus:from-sky-400/20 focus:to-blue-500/20 focus:outline-none [&.focused]:!border-transparent [&.focused]:bg-gradient-to-r [&.focused]:from-sky-400/20 [&.focused]:to-blue-500/20"
        >
          <div>
            <div className="text-sm font-bold text-white">{DIMENSION_LABELS[dimension]}</div>
            <div className="mt-0.5 text-xs font-semibold text-sky-400">
              {activeValue ? displayLabel(dimension, activeValue) : 'Any'}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-500" />
        </button>
      );
    })}
  </div>
);

// Drill-down screen for a single dimension — every value as a full-width
// row (not a wrapped chip grid), easier to scan for dimensions with many
// values (e.g. Genre, Country) and consistent regardless of how long names get.
const ValueList: React.FC<{
  dimension: DiscoverFilterKey;
  values: { value: string; count: number }[];
  activeValue?: string;
  onSelect: (value: string | undefined) => void;
}> = ({ dimension, values, activeValue, onSelect }) => (
  <div className="space-y-1" data-focus-group={`discover-${dimension}`}>
    <button
      data-focusable="true"
      onClick={() => onSelect(undefined)}
      className={`flex w-full items-center justify-between rounded-full px-4 py-3 text-left text-sm font-bold transition-all focus:outline-none ${
        !activeValue ? 'bg-gradient-to-r from-sky-400/20 to-blue-500/20 text-sky-400' : 'text-gray-300 hover:bg-white/5'
      }`}
    >
      <span>Any {DIMENSION_LABELS[dimension]}</span>
      {!activeValue && <Check className="h-4 w-4" />}
    </button>
    {values.map(({ value, count }) => {
      const isActive = activeValue === value;
      return (
        <button
          key={value}
          data-focusable="true"
          data-selected={isActive ? 'true' : 'false'}
          onClick={() => onSelect(isActive ? undefined : value)}
          className={`flex w-full items-center justify-between rounded-full px-4 py-3 text-left text-sm font-bold transition-all focus:outline-none [&.focused]:bg-gradient-to-r [&.focused]:from-sky-400/20 [&.focused]:to-blue-500/20 [&.focused]:text-sky-400 ${
            isActive ? 'bg-gradient-to-r from-sky-400/20 to-blue-500/20 text-sky-400' : 'text-gray-300 hover:bg-white/5'
          }`}
        >
          <span className="truncate">{displayLabel(dimension, value)}</span>
          <span className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-semibold text-gray-500">{count}</span>
            {isActive && <Check className="h-4 w-4" />}
          </span>
        </button>
      );
    })}
  </div>
);

export const DiscoverFilters: React.FC<DiscoverFiltersProps> = ({ facets, activeFilters, onFilterChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  // null = top-level category list; set = drilled into that dimension's values.
  const [activeDimension, setActiveDimension] = useState<DiscoverFilterKey | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Netflix-style: the dropdown stays open across selections (picking a value
  // just re-runs the browse query and updates the grid underneath) — it only
  // closes on an explicit close, Escape, or a click outside the panel.
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Escape backs out one level at a time, same as the on-screen back button.
      if (activeDimension) setActiveDimension(null);
      else close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, activeDimension]);

  const close = () => {
    setIsOpen(false);
    setActiveDimension(null);
  };

  if (!facets) return null;

  const anyFacets =
    facets.genres.length > 0 || facets.countries.length > 0 || facets.languages.length > 0 || facets.themes.length > 0;
  if (!anyFacets) return null;

  const activeCount = Object.values(activeFilters).filter(Boolean).length;

  const clearAll = () => {
    (Object.keys(activeFilters) as DiscoverFilterKey[]).forEach((key) => {
      if (activeFilters[key]) onFilterChange(key, undefined);
    });
  };

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        data-focusable="true"
        className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-[#0b1120]/85 px-4 text-sm font-bold text-gray-300 transition-all hover:border-white/20 hover:text-white focus:outline-none focus:ring-1 focus:ring-portalcast-light [&.focused]:ring-1 [&.focused]:ring-portalcast-light"
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-sky-400 to-blue-500 text-[11px] font-extrabold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        // Anchored dropdown, not a full-screen overlay — the grid/rows behind
        // it keep rendering and update live as filters are picked, instead of
        // being hidden behind a modal the user has to close first to see them.
        <div
          className="custom-scrollbar absolute left-0 top-full z-40 mt-2 max-h-[70vh] w-80 overflow-y-auto rounded-2xl border border-white/10 bg-black/85 shadow-2xl"
          data-focus-group="discover-filter-panel"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-black/85 px-4 py-3">
            <div className="flex items-center gap-2">
              {activeDimension && (
                <button
                  onClick={() => setActiveDimension(null)}
                  data-focusable="true"
                  aria-label="Back"
                  className="-ml-1.5 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <h2 className="text-base font-extrabold text-white">
                {activeDimension ? DIMENSION_LABELS[activeDimension] : 'Filters'}
              </h2>
            </div>
            <button
              onClick={close}
              data-focusable="true"
              aria-label="Close filters"
              className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-4 py-3">
            {activeDimension ? (
              <ValueList
                dimension={activeDimension}
                values={valuesFor(facets, activeDimension)}
                activeValue={activeFilters[activeDimension]}
                onSelect={(value) => onFilterChange(activeDimension, value)}
              />
            ) : (
              <CategoryList facets={facets} activeFilters={activeFilters} onOpenDimension={setActiveDimension} />
            )}
          </div>

          {!activeDimension && (
            <div className="sticky bottom-0 border-t border-white/10 bg-black/85 px-4 py-3">
              <button
                onClick={clearAll}
                data-focusable="true"
                disabled={activeCount === 0}
                className="w-full rounded-xl border border-white/10 py-2.5 text-sm font-bold text-gray-300 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DiscoverFilters;
