/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Info, Loader2 } from 'lucide-react';
import PlaybackButton from '@/components/ui/PlaybackButton';
import type { MediaItem } from '@/types';
import type { ProgressRecord } from '@/api/types/user';
import { downsize } from '@/utils/imageSize';
import { useContinueHero } from './useContinueHero';

export interface ContinueHeroProps {
  progressRecords: ProgressRecord[];
  onResume: (item: MediaItem) => void;
}

/**
 * Home's hero (design-system.md, Hero): the title last watched, on its backdrop faded in from
 * the left and the bottom, with its logo art (or name), the episode and time left, a progress
 * bar and Resume. Nothing when there is nothing to resume.
 */
const ContinueHero: React.FC<ContinueHeroProps> = ({ progressRecords, onResume }) => {
  const hero = useContinueHero(progressRecords);
  if (!hero) return null;
  const { item, details, title, art, onArtError, pct, openDetails, detailsLoading } = hero;
  const anyItem = item as any;
  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
      {art && (
        <img
          src={downsize(art, 'w1280')}
          alt=""
          className="absolute inset-y-0 right-0 h-full w-full object-cover sm:w-[70%]"
          onError={onArtError}
        />
      )}
      {/* Faded into the page from the left and from the bottom. */}
      <div className="absolute inset-0 bg-linear-to-r from-surface-3 via-surface-3/80 to-transparent sm:via-surface-3/70" />
      <div className="absolute inset-0 bg-linear-to-t from-surface-3/90 via-transparent to-transparent" />
      <div className="relative flex min-h-56 max-w-xl flex-col justify-end gap-3 p-5 sm:min-h-72 sm:p-8">
        <span className="text-xs font-bold uppercase tracking-wider text-accent">Continue watching</span>
        {details?.logo ? (
          <img src={details.logo} alt={title} className="max-h-20 max-w-[min(100%,360px)] object-contain object-left sm:max-h-24" />
        ) : (
          <h2 className="text-2xl font-black leading-tight text-white sm:text-4xl">{title}</h2>
        )}
        {details?.tagline && <p className="line-clamp-2 text-sm italic text-fg-soft">{details.tagline}</p>}
        <div className="flex items-center gap-3">
          <div className="h-1 w-40 overflow-hidden rounded-full bg-white/20 sm:w-56">
            <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
          {anyItem.cw_detail && <span className="truncate text-sm text-fg-soft">{anyItem.cw_detail}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PlaybackButton onClick={() => onResume(item)}>Resume</PlaybackButton>
          {openDetails && (
            <button
              type="button"
              onClick={openDetails}
              data-focusable="true"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-bold text-white transition-transform hover:scale-[1.03] hover:bg-interaction focus:outline-hidden focus:ring-2 focus:ring-focus [&.focused]:ring-2 [&.focused]:ring-focus"
            >
              {detailsLoading ? <Loader2 size={18} className="animate-spin" /> : <Info size={18} />}
              Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContinueHero;
