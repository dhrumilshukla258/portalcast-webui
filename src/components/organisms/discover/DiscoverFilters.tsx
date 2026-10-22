import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, X, Check, SlidersHorizontal } from 'lucide-react';
import type { DiscoverFacets } from '@/api/endpoints/discover';

export type DiscoverFilterKey = 'genre' | 'country' | 'language' | 'network' | 'theme';
export type SingleFilterKey = Exclude<DiscoverFilterKey, 'genre'>;

// Genre is multi-select (AND — a title must carry every selected genre), the
// rest stay single-select. Single-genre facets run tens of thousands deep
// (e.g. Drama alone), so narrowing by combining genres is what actually
// makes the filter useful at that volume; country/language/theme don't have
// the same volume problem and stay simple single-pick.
export interface ActiveDiscoverFilters {
  genre?: string[];
  country?: string;
  language?: string;
  /** Channel / Platform ("Zee TV", "Zee5", "Urdu TV"): Live TV channels plus streaming platforms. */
  network?: string;
  theme?: string;
}

export function hasAnyActiveFilter(activeFilters: ActiveDiscoverFilters): boolean {
  return (
    (activeFilters.genre?.length ?? 0) > 0 ||
    !!activeFilters.country ||
    !!activeFilters.language ||
    !!activeFilters.network ||
    !!activeFilters.theme
  );
}

interface DiscoverFiltersProps {
  facets: DiscoverFacets | null;
  activeFilters: ActiveDiscoverFilters;
  onFilterChange: (key: SingleFilterKey, value: string | undefined) => void;
  onGenresChange: (values: string[]) => void;
  // 'phone': one "Filters" button opening a full-screen picker (a row of five selectors does
  // not fit a phone); 'row' (default): the selectors in a row, each with its own list.
  variant?: 'row' | 'phone';
  /** 'phone': the button fills its row. */
  fullWidth?: boolean;
}

const DIMENSION_LABELS: Record<DiscoverFilterKey, string> = {
  genre: 'Genre',
  language: 'Language',
  country: 'Country',
  network: 'Channel / Platform',
  theme: 'Mood',
};

// Same selectors, same order as the TV app (Letterboxd's "Browse by" line).
const DIMENSION_ORDER: DiscoverFilterKey[] = ['genre', 'language', 'country', 'network', 'theme'];

// TMDB's originalLanguage is an ISO 639-1 code (e.g. "hi", "ta") — display the
// full name instead of the raw code. Only holds overrides Intl.DisplayNames
// can't resolve correctly (non-standard/placeholder codes) — every real
// ISO 639-1 code is resolved generically below instead of hand-maintaining
// a list that will always be missing whatever code the catalog turns up next.
const LANGUAGE_NAME_OVERRIDES: Record<string, string> = {
  cn: 'Cantonese', // TMDB's own code for Cantonese (Mandarin/Chinese is zh)
  xx: 'No Language',
  // Real ISO 639-1 codes that Intl.DisplayNames still fails to resolve on at
  // least one real runtime (confirmed via the deployed TV app) — likely a
  // reduced/small-icu ICU data build lacking full CLDR coverage for less
  // common languages, common on embedded/TV WebKit. Explicit overrides avoid
  // depending on runtime ICU completeness for these specific codes.
  ab: 'Abkhazian',
  cr: 'Cree',
  dz: 'Dzongkha',
  os: 'Ossetian',
  bo: 'Tibetan',
  ik: 'Inupiaq',
  ks: 'Kashmiri',
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
    case 'network': return facets.networks ?? [];
    case 'theme': return facets.themes;
  }
}

function summaryFor(dimension: DiscoverFilterKey, activeFilters: ActiveDiscoverFilters): string {
  if (dimension === 'genre') {
    const genres = activeFilters.genre || [];
    if (genres.length === 0) return DIMENSION_LABELS.genre;
    if (genres.length <= 2) return genres.join(', ');
    return `${genres.length} selected`;
  }
  const value = activeFilters[dimension];
  return value ? displayLabel(dimension, value) : DIMENSION_LABELS[dimension];
}

// Drill-down screen for a single dimension — every value as a full-width
// row (not a wrapped chip grid), easier to scan for dimensions with many
// values (e.g. Genre, Country) and consistent regardless of how long names get.
// Genre is multi-select (checking a box adds/removes it from the active set,
// "Any Genre" clears all of them); every other dimension is single-select
// (picking a value replaces whatever was active, "Any X" clears it).
const ValueList: React.FC<{
  dimension: DiscoverFilterKey;
  values: { value: string; count: number }[];
  activeValue?: string;
  activeValues?: string[];
  onSelect?: (value: string | undefined) => void;
  onToggle?: (value: string) => void;
}> = ({ dimension, values, activeValue, activeValues, onSelect, onToggle }) => {
  const multi = dimension === 'genre';
  const isActiveValue = (value: string) => (multi ? !!activeValues?.includes(value) : activeValue === value);
  const anyActive = multi ? (activeValues?.length ?? 0) > 0 : !!activeValue;

  // Scrolls the first currently-selected value into view as soon as this
  // list mounts (opening a dimension that already has a selection, e.g.
  // Language set to something far down an alphabetical list) — without this
  // the panel always opened scrolled to the top, so confirming/changing an
  // existing selection meant scrolling to find it every time. Only runs on
  // mount (empty deps), not on every selection change — after a click within
  // this same open panel, the list is already showing what the user just
  // clicked.
  const activeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'center' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let scrolledToRef = false;

  return (
    <div className="space-y-1" data-focus-group={`discover-${dimension}`}>
      <button
        data-focusable="true"
        onClick={() => (multi ? onToggle?.('') : onSelect?.(undefined))}
        // Multi-select's "Any" doesn't map to a single onToggle('') call —
        // handled by the caller passing a dedicated clear-all onToggle('')
        // sentinel would be fragile, so genre's Any button is wired directly
        // in DiscoverFilters below instead of through this generic handler.
        className={`flex w-full items-center justify-between rounded-full px-4 py-3 text-left text-sm font-bold transition-all focus:outline-hidden ${
          !anyActive ? 'bg-linear-to-r from-sky-400/20 to-blue-500/20 text-sky-400' : 'text-gray-300 hover:bg-white/5'
        }`}
      >
        <span>Any {DIMENSION_LABELS[dimension]}</span>
        {!anyActive && <Check className="h-4 w-4" />}
      </button>
      {values.map(({ value, count }) => {
        const isActive = isActiveValue(value);
        const assignRef = isActive && !scrolledToRef;
        if (assignRef) scrolledToRef = true;
        return (
          <button
            key={value}
            ref={assignRef ? activeRef : undefined}
            data-focusable="true"
            data-selected={isActive ? 'true' : 'false'}
            onClick={() => (multi ? onToggle?.(value) : onSelect?.(isActive ? undefined : value))}
            className={`flex w-full items-center justify-between rounded-full px-4 py-3 text-left text-sm font-bold transition-all focus:outline-hidden [&.focused]:bg-linear-to-r [&.focused]:from-sky-400/20 [&.focused]:to-blue-500/20 [&.focused]:text-sky-400 ${
              isActive ? 'bg-linear-to-r from-sky-400/20 to-blue-500/20 text-sky-400' : 'text-gray-300 hover:bg-white/5'
            }`}
          >
            <span className="truncate">{displayLabel(dimension, value)}</span>
            <span className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-gray-500">{count}</span>
              {isActive && <Check className="h-4 w-4" />}
            </span>
          </button>
        );
      })}
    </div>
  );
};

/**
 * Discover's filters as a row of selectors — "Genre ▾  Language ▾  Country ▾  Channel ▾
 * Mood ▾" — each opening its own list under it, the same as the TV app. A selector shows
 * its current value; picking applies at once. Genre stays multi-pick here (a mouse makes
 * that easy); the others are one value each.
 */
export const DiscoverFilters: React.FC<DiscoverFiltersProps> = (props) =>
  props.variant === 'phone' ? <PhoneFilters {...props} /> : <RowFilters {...props} />;

/** How many filters are set (each genre counts). */
function activeCount(f: ActiveDiscoverFilters): number {
  return (f.genre?.length ?? 0) + (['country', 'language', 'network', 'theme'] as const).filter((k) => !!f[k]).length;
}

/**
 * The phone's filters: a "Filters" button (with how many are set) opening a full-screen
 * picker. First the five selectors with their current values, then a selector's values;
 * "Show titles" closes it. Same choices and rules as the row.
 */
const PhoneFilters: React.FC<DiscoverFiltersProps> = ({ facets, activeFilters, onFilterChange, onGenresChange, fullWidth = false }) => {
  const [sheet, setSheet] = useState(false);
  const [dim, setDim] = useState<DiscoverFilterKey | null>(null);
  useEffect(() => {
    if (!sheet) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (dim) setDim(null);
      else setSheet(false);
    };
    document.addEventListener('keydown', onKeyDown);
    // The page under the sheet does not scroll along.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [sheet, dim]);

  if (!facets) return null;
  const dims = DIMENSION_ORDER.filter((d) => valuesFor(facets, d).length > 0);
  if (dims.length === 0) return null;
  const count = activeCount(activeFilters);
  const toggleGenre = (value: string) => {
    const current = activeFilters.genre || [];
    onGenresChange(current.includes(value) ? current.filter((v) => v !== value) : [...current, value]);
  };
  const clearAll = () => {
    if (activeFilters.genre?.length) onGenresChange([]);
    (['country', 'language', 'network', 'theme'] as const).forEach((k) => { if (activeFilters[k]) onFilterChange(k, undefined); });
  };
  const close = () => { setSheet(false); setDim(null); };

  return (
    <>
      <button
        data-focusable="true"
        onClick={() => setSheet(true)}
        className={`flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-bold transition-all focus:outline-hidden ${fullWidth ? 'w-full' : ''} ${
          count > 0 ? 'border-transparent bg-linear-to-r from-sky-400 to-blue-500 text-white' : 'border-white/15 bg-[#0b1120]/85 text-gray-200'
        }`}
      >
        <SlidersHorizontal className="h-4 w-4" />
        {count > 0 ? `Filters · ${count}` : 'Filters'}
        <ChevronDown className="h-4 w-4" />
      </button>
      {sheet && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-[#0A0F1C]" role="dialog" aria-modal="true" data-focus-group="discover-phone-filters">
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 px-2">
            <button
              data-focusable="true"
              onClick={() => (dim ? setDim(null) : close())}
              aria-label={dim ? 'Back' : 'Close'}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10"
            >
              {dim ? <ChevronLeft className="h-6 w-6" /> : <X className="h-6 w-6" />}
            </button>
            <h2 className="flex-1 truncate text-lg font-bold text-white">{dim ? DIMENSION_LABELS[dim] : 'Filters'}</h2>
            {count > 0 && !dim && (
              <button data-focusable="true" onClick={clearAll} className="rounded-full px-3 py-2 text-sm font-bold text-gray-300 hover:bg-white/10">
                Clear all
              </button>
            )}
          </div>
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
            {dim === null ? (
              <div className="space-y-1">
                {dims.map((d) => {
                  const set = d === 'genre' ? (activeFilters.genre?.length ?? 0) > 0 : !!activeFilters[d];
                  return (
                    <button
                      key={d}
                      data-focusable="true"
                      onClick={() => setDim(d)}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-4 text-left hover:bg-white/5"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-bold text-white">{DIMENSION_LABELS[d]}</span>
                        <span className={`block truncate text-sm ${set ? 'text-sky-400' : 'text-gray-500'}`}>
                          {set ? summaryFor(d, activeFilters) : `Any ${DIMENSION_LABELS[d].toLowerCase()}`}
                        </span>
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-gray-500" />
                    </button>
                  );
                })}
              </div>
            ) : dim === 'genre' ? (
              <ValueList
                dimension="genre"
                values={valuesFor(facets, 'genre')}
                activeValues={activeFilters.genre || []}
                onToggle={(value) => (value === '' ? onGenresChange([]) : toggleGenre(value))}
              />
            ) : (
              <ValueList
                dimension={dim}
                values={valuesFor(facets, dim)}
                activeValue={activeFilters[dim]}
                onSelect={(value) => { onFilterChange(dim, value); setDim(null); }}
              />
            )}
          </div>
          <div className="shrink-0 border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button data-focusable="true" onClick={close} className="h-12 w-full rounded-xl bg-white text-base font-bold text-[#0A0F1C]">
              Show titles
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const RowFilters: React.FC<DiscoverFiltersProps> = ({ facets, activeFilters, onFilterChange, onGenresChange }) => {
  const [open, setOpen] = useState<DiscoverFilterKey | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!facets) return null;
  const dims = DIMENSION_ORDER.filter((dim) => valuesFor(facets, dim).length > 0);
  if (dims.length === 0) return null;

  const isSet = (dim: DiscoverFilterKey) => (dim === 'genre' ? (activeFilters.genre?.length ?? 0) > 0 : !!activeFilters[dim]);
  const toggleGenre = (value: string) => {
    const current = activeFilters.genre || [];
    onGenresChange(current.includes(value) ? current.filter((v) => v !== value) : [...current, value]);
  };
  const clearAll = () => {
    if (activeFilters.genre?.length) onGenresChange([]);
    (['country', 'language', 'network', 'theme'] as const).forEach((k) => { if (activeFilters[k]) onFilterChange(k, undefined); });
    setOpen(null);
  };

  return (
    <div ref={containerRef} className="flex flex-wrap items-center gap-2" data-focus-group="discover-selectors">
      {dims.map((dim) => (
        <div key={dim} className="relative">
          <button
            data-focusable="true"
            onClick={() => setOpen((cur) => (cur === dim ? null : dim))}
            className={`flex h-9 max-w-56 items-center gap-1.5 rounded-full border px-4 text-sm font-bold transition-all focus:outline-hidden focus:ring-1 focus:ring-portalcast-light [&.focused]:ring-1 [&.focused]:ring-portalcast-light ${
              isSet(dim)
                ? 'border-transparent bg-linear-to-r from-sky-400 to-blue-500 text-white'
                : 'border-white/10 bg-[#0b1120]/85 text-gray-300 hover:border-white/20 hover:text-white'
            }`}
          >
            <span className="truncate">{summaryFor(dim, activeFilters)}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open === dim ? 'rotate-180' : ''}`} />
          </button>
          {open === dim && (
            // Near-solid, anchored under its own selector (same as the TV).
            <div
              className="custom-scrollbar absolute left-0 top-full z-40 mt-2 max-h-[60vh] w-80 overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1120]/[0.97] p-2 shadow-2xl"
              data-focus-group={`discover-${dim}-list`}
            >
              {dim === 'genre' ? (
                <ValueList
                  dimension="genre"
                  values={valuesFor(facets, 'genre')}
                  activeValues={activeFilters.genre || []}
                  onToggle={(value) => (value === '' ? onGenresChange([]) : toggleGenre(value))}
                />
              ) : (
                <ValueList
                  dimension={dim}
                  values={valuesFor(facets, dim)}
                  activeValue={activeFilters[dim]}
                  onSelect={(value) => { onFilterChange(dim, value); setOpen(null); }}
                />
              )}
            </div>
          )}
        </div>
      ))}
      {hasAnyActiveFilter(activeFilters) && (
        <button
          data-focusable="true"
          onClick={clearAll}
          className="flex h-9 items-center gap-1 rounded-full px-3 text-sm font-bold text-gray-400 transition-colors hover:bg-white/5 hover:text-white focus:outline-hidden [&.focused]:text-white"
        >
          <X className="h-4 w-4" /> Clear
        </button>
      )}
    </div>
  );
};

export default DiscoverFilters;
