import React, { useMemo } from 'react';
import { Play, ChevronDown, Clock } from 'lucide-react';
import type { MediaItem } from '@/types';
import { URL_PATHS } from '@/api/config';

interface EpisodeAccordionRowProps {
  item: MediaItem;
  isExpanded: boolean;
  isCompleted?: boolean;
  onToggle: () => void;
  onPlay: (item: MediaItem) => void;
  // Marks this row's Play button as the TV-remote landing target when the
  // page has no other obvious default (e.g. no trailer button) — otherwise
  // whatever's literally first in the DOM (like the page's Back button)
  // gets stuck with the focus glow on load.
  isDefaultFocus?: boolean;
}

// Episodes rarely carry their own thumbnail, so the row leads with a Play
// button instead of reserving space for an image that's usually blank.
// Play is a direct action — no expand step required. The expand toggle
// (only shown when there's a description) reveals just the synopsis below,
// decoupled from playback.
const EpisodeAccordionRow: React.FC<EpisodeAccordionRowProps> = ({
  item,
  isExpanded,
  isCompleted = false,
  onToggle,
  onPlay,
  isDefaultFocus = false,
}) => {
  const baseUrl = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
  const displayTitle = item.title || item.name || 'Episode';

  const imageUrl = useMemo(() => {
    if (!item.screenshot_uri) return null;
    return item.screenshot_uri.startsWith('http')
      ? item.screenshot_uri
      : `${baseUrl}/api/images${item.screenshot_uri}`;
  }, [item.screenshot_uri, baseUrl]);

  return (
    <div
      className={`overflow-hidden rounded-xl border transition-colors duration-200 ${
        isExpanded ? 'border-blue-500/40 bg-blue-950/20' : 'border-white/5 bg-white/5 hover:bg-white/10'
      }`}
    >
      <div className="flex w-full items-center gap-3 p-3 text-left">
        {isCompleted && <div className="h-2 w-2 shrink-0 rounded-full bg-green-500" />}

        <button
          onClick={() => onPlay(item)}
          data-focusable="true"
          data-default-focus={isDefaultFocus ? 'true' : undefined}
          aria-label={`Play ${displayTitle}`}
          className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-white shadow-md transition-all hover:bg-blue-500 active:scale-95"
        >
          {imageUrl ? (
            <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
          ) : null}
          <Play size={16} className="relative fill-current" />
        </button>

        <button
          onClick={() => onPlay(item)}
          data-focusable="true"
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-center gap-2">
            {item.episode_num && (
              <span className="shrink-0 text-xs font-black text-blue-400">{item.episode_num}.</span>
            )}
            <h4 className="truncate text-sm font-bold text-white sm:text-base">{displayTitle}</h4>
          </div>
          {item.duration && (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
              <Clock size={11} />
              <span>{Math.floor(item.duration / 60) || item.duration} mins</span>
            </div>
          )}
        </button>

        {item.description && (
          <button
            onClick={onToggle}
            data-focusable="true"
            aria-label={isExpanded ? 'Hide episode description' : 'Show episode description'}
            className="shrink-0 rounded-full p-1.5 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ChevronDown
              size={18}
              className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>

      {isExpanded && item.description && (
        <div className="border-t border-white/5 p-3 pt-3">
          <p className="text-sm leading-relaxed text-gray-300">{item.description}</p>
        </div>
      )}
    </div>
  );
};

export default EpisodeAccordionRow;
