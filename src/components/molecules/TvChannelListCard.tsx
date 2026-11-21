import React, { useState } from 'react';
import { URL_PATHS } from '@/api/config';
import type { EPG_List, MediaItem } from '@/types';
import { cleanChannelName, monogram, nameHue, nowAndNext } from '@/utils/channelRow';

interface TvChannelListCardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
  isFocused: boolean;
  /** This channel's programmes from the guide already loaded (useMediaLibrary's EPG window). */
  programs?: EPG_List[];
  /** The list's clock (ms, ticking once a minute): with it the row shows what is on now and next. */
  now?: number;
}

const clock = (unixSeconds: string) =>
  new Date(Number(unixSeconds) * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/**
 * A Live TV row: number, logo (else a monogram tile in the channel's own colour), the name
 * without its quality tags (shown as small badges), and, from the guide, what is on now with
 * how far through it is, and what is next on wide screens. Nothing here asks the server.
 */
const TvChannelListCard: React.FC<TvChannelListCardProps> = React.memo(({ item, onClick, isFocused, programs, now }) => {
  const raw = item.name || item.title || 'Unknown Channel';
  const { name, tags } = cleanChannelName(raw);
  const [logoFailed, setLogoFailed] = useState(false);
  const baseUrl = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
  const logo = item.screenshot_uri
    ? item.screenshot_uri.startsWith('http')
      ? item.screenshot_uri
      : `${baseUrl}/api/images${item.screenshot_uri}`
    : null;
  const showLogo = !!logo && !logoFailed;
  const guide = now !== undefined ? nowAndNext(programs, now) : null;

  return (
    <div
      className={`group my-0.5 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 sm:gap-3 sm:px-3 sm:py-2 ${
        isFocused
          ? 'ui-selected z-10 scale-[1.01] border'
          : 'border border-transparent bg-transparent hover:scale-[1.01] hover:bg-interaction'
      }`}
      onClick={() => onClick(item)}
      title={raw}
      data-focusable="true"
      tabIndex={-1}
    >
      <span className="w-8 shrink-0 text-left text-xs tabular-nums text-fg-subtle sm:w-10 sm:text-sm">{item.number || ''}</span>
      <div
        className={`flex h-8 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md sm:h-10 sm:w-14 ${showLogo ? 'bg-white/5' : ''}`}
        style={showLogo ? undefined : { background: `var(--ui-channel-monogram, hsl(${nameHue(name)} 35% 24%))` }}
      >
        {showLogo ? (
          <img
            src={logo!}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain drop-shadow-xs"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <span className="text-xs font-bold tracking-wide text-white/85 sm:text-sm">{monogram(name)}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate text-sm font-medium text-fg sm:text-base">{name}</h3>
          {tags.map((t) => (
            <span key={t} className="shrink-0 rounded border border-line px-1 text-3xs font-semibold leading-4 text-fg-muted">
              {t}
            </span>
          ))}
        </div>
        {guide?.now && (
          <div className="mt-0.5 flex items-center gap-2">
            <p className="min-w-0 truncate text-xs text-fg-muted sm:text-sm">{guide.now.name}</p>
            <span className="h-0.5 w-12 shrink-0 overflow-hidden rounded-full bg-white/15 sm:w-16" aria-hidden>
              <span className="block h-full bg-white/60" style={{ width: `${guide.progress}%` }} />
            </span>
          </div>
        )}
      </div>
      {guide?.next && (
        <p className="hidden max-w-[35%] shrink-0 truncate text-right text-xs text-fg-subtle lg:block">
          {clock(guide.next.start_timestamp)} · {guide.next.name}
        </p>
      )}
    </div>
  );
});

export default TvChannelListCard;
