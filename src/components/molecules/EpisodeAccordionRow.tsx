import { forwardRef, useMemo } from 'react';
import { Play } from 'lucide-react';
import type { MediaItem } from '@/types';
import { URL_PATHS } from '@/api/config';
import { episodeAirDate, episodeNumber, episodeRuntime, episodeTitle } from '@/utils/episodeInfo';

interface EpisodeAccordionRowProps {
  item: MediaItem;
  /** Position in the season (for the number when the name carries none). */
  index: number;
  /** The show's name: an episode named only that shows as "Episode N". */
  seriesTitle?: string;
  isCompleted?: boolean;
  /** 0..100 watched, for the bar under the still. */
  progressPercent?: number;
  /** The episode the viewer is in the middle of: marked, and the page opens on it. */
  isResume?: boolean;
  onPlay: (item: MediaItem) => void;
  // Marks this row as the TV-remote landing target (the resume episode, else the first).
  isDefaultFocus?: boolean;
}

/**
 * One episode, Netflix-style — the same row as the TV app: number, a 16:9 still when the
 * episode has one, the title (number prefix and air date taken out of it), a line with
 * "Continue watching" / air date / runtime / Watched, and a two-line description. An
 * episode with no still and no description is a single text line. The whole row plays.
 */
const EpisodeAccordionRow = forwardRef<HTMLButtonElement, EpisodeAccordionRowProps>(({
  item,
  index,
  seriesTitle,
  isCompleted = false,
  progressPercent,
  isResume = false,
  onPlay,
  isDefaultFocus = false,
}, ref) => {
  const baseUrl = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
  const number = episodeNumber(item, index);
  const title = episodeTitle(item, index, seriesTitle);
  const overview = String(item.description || '').trim();

  const imageUrl = useMemo(() => {
    if (!item.screenshot_uri) return null;
    return item.screenshot_uri.startsWith('http') ? item.screenshot_uri : `${baseUrl}/api/images${item.screenshot_uri}`;
  }, [item.screenshot_uri, baseUrl]);

  const sub = [
    isResume ? '▶ Continue watching' : null,
    episodeAirDate(item, seriesTitle),
    episodeRuntime(item),
    isCompleted ? 'Watched' : null,
  ].filter(Boolean).join('  ·  ');
  const compact = !imageUrl && !overview;

  return (
    <button
      ref={ref}
      onClick={() => onPlay(item)}
      data-focusable="true"
      data-default-focus={isDefaultFocus ? 'true' : undefined}
      aria-label={`Play episode ${number}: ${title}`}
      className={`group flex w-full items-center gap-3 rounded-xl border text-left transition-colors focus:outline-hidden ${
        compact ? 'px-3 py-2' : 'p-2.5'
      } ${
        isResume ? 'border-sky-400/40 bg-sky-400/10' : 'border-transparent hover:bg-white/10'
      } focus:border-white/80 focus:bg-white/15 [&.focused]:border-white/80 [&.focused]:bg-white/15`}
    >
      <span className="w-9 shrink-0 text-center text-lg font-bold text-gray-400 group-hover:text-white group-[.focused]:text-white">
        {number}
      </span>
      {imageUrl && (
        <span className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-md bg-white/5 sm:w-40">
          <img src={imageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60"><Play size={16} className="fill-white text-white" /></span>
          </span>
          {progressPercent !== undefined && progressPercent > 0 && (
            <span className="absolute inset-x-1.5 bottom-1.5 h-1 overflow-hidden rounded-full bg-white/25">
              <span className="block h-full bg-sky-400" style={{ width: `${Math.min(100, progressPercent)}%` }} />
            </span>
          )}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-white sm:text-base">{title}</span>
        {sub && <span className="mt-0.5 block truncate text-xs text-gray-400">{sub}</span>}
        {overview && (
          <span className="mt-1 line-clamp-2 text-sm leading-snug text-gray-400 group-hover:line-clamp-4 group-[.focused]:line-clamp-4">
            {overview}
          </span>
        )}
      </span>
    </button>
  );
});

EpisodeAccordionRow.displayName = 'EpisodeAccordionRow';

export default EpisodeAccordionRow;
