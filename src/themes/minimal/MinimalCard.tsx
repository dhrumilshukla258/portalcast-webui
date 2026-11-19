import { useEffect, useState } from 'react';
import { Check, Ellipsis } from 'lucide-react';
import { useTitleMenu } from '@/context/TitleMenuContext';
import { useLongPress } from '@/hooks/useLongPress';
import { useIptvOffline } from '@/utils/iptvHealth';
import { URL_PATHS } from '@/api/config';
import { cardPoster } from '@/utils/imageSize';
import type { MediaCardProps } from '@/components/molecules/MediaCard';
import MinimalPoster, { PosterAction, PosterBadge } from './MinimalPoster';

/**
 * Minimal theme's title card (registry Card): MinimalPoster with the title menu (⋯ on hover,
 * hold or right-click), a Local badge, a tick when watched and the search match highlighted.
 * No rating or channel badges.
 */
const MinimalCard = ({
  item,
  onClick,
  progressPercent,
  isCompleted = false,
  categoryLabel,
  highlightTerm,
  isLoading = false,
  posterOnlyOnPhone = false,
  staticFrame = false,
}: MediaCardProps & { staticFrame?: boolean }) => {
  const [imageError, setImageError] = useState(false);
  const openMenu = useTitleMenu();
  const hold = useLongPress(openMenu ? () => openMenu(item) : undefined);
  const iptvOffline = useIptvOffline();
  useEffect(() => setImageError(false), [item.screenshot_uri]);

  const title = item.title || item.name || '';
  const base = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
  const shot = item.screenshot_uri;
  const image = shot && !imageError ? cardPoster(shot.startsWith('http') ? shot : `${base}/api/images${shot}`) : null;
  const isLocal = String(item.is_local) === '1';
  const at = highlightTerm ? title.toLowerCase().indexOf(highlightTerm.toLowerCase()) : -1;

  return (
    <MinimalPoster
      staticFrame={staticFrame}
      title={title}
      image={image}
      onImageError={() => setImageError(true)}
      onActivate={() => onClick(item)}
      handlers={hold}
      progress={progressPercent ?? item.progressPercent}
      dim={iptvOffline && !isLocal && item.category_id !== 'local'}
      loading={isLoading}
      topLeft={isLocal && <PosterBadge>{item.quality?.includes('4K') ? 'Local · 4K' : 'Local'}</PosterBadge>}
      topRight={
        isCompleted && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white">
            <Check size={12} strokeWidth={3} />
          </span>
        )
      }
      action={
        openMenu && (
          <PosterAction label="More: My List, Mark as watched, Not interested" onClick={() => openMenu(item)}>
            <Ellipsis size={16} />
          </PosterAction>
        )
      }
      caption={
        at >= 0 ? (
          <>
            {title.slice(0, at)}
            <mark className="rounded-sm bg-white/20 text-white">{title.slice(at, at + highlightTerm!.length)}</mark>
            {title.slice(at + highlightTerm!.length)}
          </>
        ) : (
          title
        )
      }
      detail={categoryLabel}
      captionHiddenOnPhone={posterOnlyOnPhone && !!image}
    />
  );
};

export default MinimalCard;
export const ConsoleCard = (props: MediaCardProps) => <MinimalCard {...props} staticFrame />;
