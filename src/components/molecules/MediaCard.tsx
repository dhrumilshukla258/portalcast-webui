import React, { useState, useEffect } from 'react';
import { URL_PATHS } from '@/api/config';
import type { MediaItem } from '@/types';

interface MediaCardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
  progressPercent?: number;
  isCompleted?: boolean;
  categoryLabel?: string;
  highlightTerm?: string;
  // True while THIS specific card's click is being resolved (e.g. Discover's
  // handleDiscoverItemClick awaiting a variants check + getMedia/getSeries
  // before it can open anything). Without this, a slow resolve reads as a
  // dead click — no visual difference between "nothing happened" and "still
  // working on it" — which is exactly what made Discover clicks look broken.
  isLoading?: boolean;
}

// Splits `text` around the first case-insensitive match of `term` so the
// caller can render the matched slice distinctly (search result highlight).
function splitOnMatch(text: string, term: string): [string, string, string] | null {
  if (!term) return null;
  const index = text.toLowerCase().indexOf(term.toLowerCase());
  if (index === -1) return null;
  return [text.slice(0, index), text.slice(index, index + term.length), text.slice(index + term.length)];
}

const MediaCard: React.FC<MediaCardProps> = React.memo(({
  item,
  onClick,
  progressPercent,
  isCompleted = false,
  categoryLabel,
  highlightTerm,
  isLoading = false,
}) => {
  const [imageError, setImageError] = useState(false);

  const displayTitle = item.title || item.name;
  const baseUrl = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
  const initials = displayTitle
    ? displayTitle.substring(0, 2).toUpperCase()
    : '??';
  const imageUrl = item.screenshot_uri
    ? item.screenshot_uri.startsWith('http')
      ? item.screenshot_uri
      : `${baseUrl}/api/images${item.screenshot_uri}`
    : null;

  useEffect(() => {
    setImageError(false);
  }, [item.screenshot_uri]);

  const displayProgress = progressPercent ?? item.progressPercent;
  const highlighted = highlightTerm && displayTitle ? splitOnMatch(displayTitle, highlightTerm) : null;

  // No custom IntersectionObserver gate here — it used to hold `isVisible`
  // false until the observer fired (at least one frame, plus the 100px
  // rootMargin threshold) before even attempting to render the <img>, which
  // meant an already-cached poster still had to wait through that JS-side
  // delay before it could paint, even though the bytes were instantly
  // available. loading="lazy" on the <img> tag below lets the browser make
  // that deferral decision itself — its native heuristics don't add that
  // extra round-trip, so a cached image just paints as soon as it's in the
  // DOM.

  return (
    <div
      className="group relative transform cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-black/65 transition-all duration-300 hover:scale-[1.03] hover:border-portalcast-light/50 hover:bg-black/75 hover:shadow-2xl hover:shadow-black/40"
      onClick={() => {
        if (isLoading) return; // avoid re-triggering the resolve while one is already in flight for this card
        onClick(item);
      }}
      title={displayTitle}
      data-focusable="true"
      tabIndex={-1}
    >
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/75">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      )}
      {isCompleted && (
        <div className="absolute right-2 top-2 z-10 h-3 w-3 rounded-full bg-green-500"></div>
      )}

      <div className="relative z-1 flex aspect-2/3 w-full items-center justify-center overflow-hidden bg-black/20">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={displayTitle}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-white/10 to-transparent">
            <span className="select-none text-2xl font-bold text-white/30 md:text-4xl">
              {initials}
            </span>
          </div>
        )}
        {}
        {displayProgress !== undefined && displayProgress > 0 && (
          <div className="absolute bottom-0 left-0 h-1 w-full bg-gray-600/80">
            <div
              className="h-full bg-linear-to-r from-portalcast-light to-portalcast-dark transition-all duration-300"
              style={{ width: `${Math.min(100, displayProgress)}%` }}
            />
          </div>
        )}
      </div>
      <div className="relative z-1 flex flex-col items-center justify-center gap-0.5 p-3 md:p-4">
        <h3 className="w-full truncate text-center text-sm font-bold text-white transition-colors duration-300 group-hover:text-portalcast-light md:text-base">
          {highlighted ? (
            <>
              {highlighted[0]}
              <mark className="rounded-sm bg-blue-500/40 text-white">{highlighted[1]}</mark>
              {highlighted[2]}
            </>
          ) : (
            displayTitle
          )}
        </h3>
        {categoryLabel && (
          <span className="w-full truncate text-center text-xs text-gray-500">
            {categoryLabel}
          </span>
        )}
      </div>
    </div>
  );
});

export default MediaCard;
