/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Info, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import PlaybackButton from '@/components/ui/PlaybackButton';
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
const MinimalContinueCard = ({ item, onClick, onRemove, onRemoveNow, onDetails, opening, staticFrame = false }: ContinueCardProps & { staticFrame?: boolean }) => {
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
      staticFrame={staticFrame}
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
            <div className="poster-action-strip absolute inset-x-0 bottom-0 z-10 hidden items-end justify-center gap-2.5 bg-linear-to-t from-black/80 via-black/30 to-transparent px-2 pt-14 pb-5 group-focus-within:flex sm:group-hover:flex">
              <PlaybackButton iconOnly title="Resume" onClick={(e) => { e.stopPropagation(); onClick(item); }}>Resume</PlaybackButton>
              {onDetails && (
                <Button aria-label="Details" title="Details" onClick={(e) => { e.stopPropagation(); onDetails(); }}
                  className="minimal-glass-action h-11 w-11 rounded-full p-0 [--action-alpha:0.2] [--action-hover-alpha:0.3] text-fg backdrop-blur-md">
                  <Info size={18} aria-hidden="true" />
                </Button>
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
export const ConsoleContinueCard = (props: ContinueCardProps) => <MinimalContinueCard {...props} staticFrame />;
