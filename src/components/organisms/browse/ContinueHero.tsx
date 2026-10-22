/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Play } from 'lucide-react';
import type { MediaItem } from '@/types';
import type { ProgressRecord } from '@/api/types/user';
import { URL_PATHS } from '@/api/config';
import { getTitleDetails, type TitleDetails } from '@/api/endpoints/discover';
import { continueItemsOf } from '@/utils/continueItems';
import { downsize } from '@/utils/imageSize';
import { isContentId } from '@/utils/titleFormat';

interface ContinueHeroProps {
  progressRecords: ProgressRecord[];
  onResume: (item: MediaItem) => void;
}

const urlOf = (path: string | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
  return path.startsWith('/api/') ? `${base}${path}` : `${base}/api/images${path}`;
};

/**
 * Home's hero (design-system.md, Hero): the title last watched, on its backdrop faded in from
 * the left and the bottom, with its logo art (or name), the episode and time left, a progress
 * bar and Resume. Nothing when there is nothing to resume.
 */
const ContinueHero: React.FC<ContinueHeroProps> = ({ progressRecords, onResume }) => {
  const item = React.useMemo(() => continueItemsOf(progressRecords)[0], [progressRecords]);
  const anyItem = item as any;
  const catalogId: string = item?.catalogId ? String(item.catalogId) : '';
  const [details, setDetails] = React.useState<TitleDetails | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    setDetails(null);
    if (!isContentId(catalogId)) return;
    void getTitleDetails({ id: catalogId }).then((d) => {
      if (!cancelled) setDetails(d);
    });
    return () => {
      cancelled = true;
    };
  }, [catalogId]);
  const [artFailed, setArtFailed] = React.useState(false);
  React.useEffect(() => setArtFailed(false), [anyItem?.cw_backdrop]);
  if (!item) return null;

  const title: string = anyItem.cw_show_title || item.title || item.name || '';
  const art = urlOf(anyItem.cw_backdrop);
  const pct = Math.min(100, Math.max(0, Number(item.progressPercent) || 0));
  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
      {art && !artFailed && (
        <img
          src={downsize(art, 'w1280')}
          alt=""
          className="absolute inset-y-0 right-0 h-full w-full object-cover sm:w-[70%]"
          onError={() => setArtFailed(true)}
        />
      )}
      {/* Faded into the page from the left and from the bottom. */}
      <div className="absolute inset-0 bg-linear-to-r from-[#0A0F1C] via-[#0A0F1C]/80 to-transparent sm:via-[#0A0F1C]/70" />
      <div className="absolute inset-0 bg-linear-to-t from-[#0A0F1C]/90 via-transparent to-transparent" />
      <div className="relative flex min-h-56 max-w-xl flex-col justify-end gap-3 p-5 sm:min-h-72 sm:p-8">
        <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Continue watching</span>
        {details?.logo ? (
          <img src={details.logo} alt={title} className="max-h-20 max-w-[min(100%,360px)] object-contain object-left sm:max-h-24" />
        ) : (
          <h2 className="text-2xl font-black leading-tight text-white sm:text-4xl">{title}</h2>
        )}
        {details?.tagline && <p className="line-clamp-2 text-sm italic text-gray-300">{details.tagline}</p>}
        <div className="flex items-center gap-3">
          <div className="h-1 w-40 overflow-hidden rounded-full bg-white/20 sm:w-56">
            <div className="h-full bg-sky-400" style={{ width: `${pct}%` }} />
          </div>
          {anyItem.cw_detail && <span className="truncate text-sm text-gray-200">{anyItem.cw_detail}</span>}
        </div>
        <div>
          <button
            type="button"
            onClick={() => onResume(item)}
            data-focusable="true"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-[#0A0F1C] transition-transform hover:scale-[1.03] focus:outline-hidden focus:ring-2 focus:ring-sky-400 [&.focused]:ring-2 [&.focused]:ring-sky-400"
          >
            <Play size={18} className="fill-current" />
            Resume
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContinueHero;
