/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Info, Play, X } from 'lucide-react';
import { useTitleMenu } from '@/context/TitleMenuContext';
import { useLongPress } from '@/hooks/useLongPress';
import { downsize, AMBIENT_BACKDROP } from '@/utils/imageSize';
import { continueImageUrl, type ContinueCardProps } from '@/components/organisms/browse/continueCard';
import MinimalPoster, { PosterAction } from './MinimalPoster';

/**
 * Minimal theme's Continue Watching card (registry ContinueCard): MinimalPoster with the
 * progress inside the art, "Episode · 23 min left" under the title, × to remove (asks
 * first, as Classic's does), and on hover Resume and Details over the art (on a phone: tap
 * resumes, hold for Details).
 */
function RoundButton({ label, onClick, className, children }: { label: string; onClick: () => void; className: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-focusable="true"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg shadow-black/40 transition-[background-color,transform] duration-200 hover:scale-105 active:scale-95 ${className}`}
    >
      {children}
    </button>
  );
}

const MinimalContinueCard = ({ item, onClick, onRemove, onRemoveNow, onDetails, opening }: ContinueCardProps) => {
  const anyItem = item as any;
  const openMenu = useTitleMenu();
  const hold = useLongPress(openMenu ? () => openMenu(item, { onRemoveFromContinue: onRemoveNow, onDetails: onDetails ?? undefined }) : undefined);
  const [failed, setFailed] = useState(false);
  const poster = continueImageUrl(item.screenshot_uri);
  const wide = continueImageUrl(anyItem.cw_backdrop);
  const src = !failed && poster ? downsize(poster, 'w342') : wide ? downsize(wide, AMBIENT_BACKDROP) : null;
  const title: string = anyItem.cw_show_title || item.title || item.name || '';

  return (
    <MinimalPoster
      title={title}
      image={src ? { src } : null}
      onImageError={() => setFailed(true)}
      onActivate={() => onClick(item)}
      handlers={hold}
      progress={Math.min(100, Math.max(0, Number(item.progressPercent) || 0))}
      loading={opening}
      action={
        <>
          <PosterAction label="Remove from Continue Watching" onClick={onRemove} onPhone>
            <X size={15} strokeWidth={2.5} />
          </PosterAction>
          {/* Two ways in, on hover: Resume plays on, Details opens the title's page. */}
          {!opening && (
            <div className="absolute inset-x-0 bottom-0 z-10 hidden items-end justify-center gap-2.5 bg-linear-to-t from-black/80 via-black/30 to-transparent px-2 pt-14 pb-5 group-focus-within:flex sm:group-hover:flex">
              <RoundButton label="Resume" onClick={() => onClick(item)} className="bg-white text-black hover:bg-white/90">
                <Play size={16} className="ml-0.5 fill-current" />
              </RoundButton>
              {onDetails && (
                <RoundButton label="Details" onClick={onDetails} className="bg-white/20 text-white backdrop-blur-md hover:bg-white/30">
                  <Info size={18} />
                </RoundButton>
              )}
            </div>
          )}
        </>
      }
      caption={title}
      detail={anyItem.cw_detail}
    />
  );
};

export default MinimalContinueCard;
