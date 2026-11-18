/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { X } from 'lucide-react';
import { useTitleMenu } from '@/context/TitleMenuContext';
import { useLongPress } from '@/hooks/useLongPress';
import { downsize, AMBIENT_BACKDROP } from '@/utils/imageSize';
import { continueImageUrl, type ContinueCardProps } from '@/components/organisms/browse/continueCard';
import MinimalPoster, { PosterAction } from './MinimalPoster';

/**
 * Minimal theme's Continue Watching card (registry ContinueCard): MinimalPoster with the
 * progress inside the art, "Episode · 23 min left" under the title, and × to remove (asks
 * first, as Classic's does).
 */
const MinimalContinueCard = ({ item, onClick, onRemove, onRemoveNow }: ContinueCardProps) => {
  const anyItem = item as any;
  const openMenu = useTitleMenu();
  const hold = useLongPress(openMenu ? () => openMenu(item, { onRemoveFromContinue: onRemoveNow }) : undefined);
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
      action={
        <PosterAction label="Remove from Continue Watching" onClick={onRemove} onPhone>
          <X size={15} strokeWidth={2.5} />
        </PosterAction>
      }
      caption={title}
      detail={anyItem.cw_detail}
    />
  );
};

export default MinimalContinueCard;
