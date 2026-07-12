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
}

const EpisodeAccordionRow: React.FC<EpisodeAccordionRowProps> = ({
  item,
  isExpanded,
  isCompleted = false,
  onToggle,
  onPlay,
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
      <button
        onClick={onToggle}
        data-focusable="true"
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        {isCompleted && (
          <div className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
        )}
        <div className="relative flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/30 sm:h-16 sm:w-28">
          {imageUrl ? (
            <img src={imageUrl} alt={displayTitle} className="h-full w-full object-cover" />
          ) : (
            <span className="select-none text-xs font-bold text-white/30">
              {item.episode_num ? `EP ${item.episode_num}` : ''}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {item.episode_num && (
              <span className="shrink-0 text-xs font-black text-blue-400">
                {item.episode_num}.
              </span>
            )}
            <h4 className="truncate text-sm font-bold text-white sm:text-base">
              {displayTitle}
            </h4>
          </div>
          {item.duration && (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
              <Clock size={11} />
              <span>{Math.floor(item.duration / 60) || item.duration} mins</span>
            </div>
          )}
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-3 border-t border-white/5 p-3 pt-3 sm:flex-row sm:items-start">
          {imageUrl && (
            <div className="hidden h-24 w-40 shrink-0 overflow-hidden rounded-lg bg-black/30 sm:block">
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            {item.description && (
              <p className="text-sm leading-relaxed text-gray-300">{item.description}</p>
            )}
            <button
              onClick={() => onPlay(item)}
              data-focusable="true"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-blue-500 active:scale-95"
            >
              <Play size={14} className="fill-current" />
              <span>Play Episode</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EpisodeAccordionRow;
