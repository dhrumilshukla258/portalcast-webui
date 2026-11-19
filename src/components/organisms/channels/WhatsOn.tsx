import { useMemo, useState } from 'react';
import { Play } from 'lucide-react';
import type { ChannelGroup, EPG_List, MediaItem } from '@/types';
import { URL_PATHS } from '@/api/config';
import MediaCardRow from '@/components/organisms/browse/MediaCardRow';
import Button from '@/components/ui/Button';
import { cleanChannelName, monogram, nameHue, nowAndNext, whatsOn, type OnNow } from '@/utils/channelRow';

interface WhatsOnProps {
  channels: MediaItem[];
  groups: ChannelGroup[];
  epgData: Record<string, EPG_List[]>;
  /** The list's clock (ms, once a minute). */
  now: number;
  favorites?: string[];
  recentChannels?: string[];
  onPlay: (channel: MediaItem) => void;
}

const clock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const leftOf = (p: EPG_List, at: number) => Math.max(0, Math.round((Number(p.stop_timestamp) * 1000 - at) / 60_000));
const nameOf = (c: MediaItem) => cleanChannelName(c.name || c.title || '').name;

function logoUrl(c: MediaItem): string | null {
  const u = c.screenshot_uri;
  if (!u) return null;
  if (u.startsWith('http')) return u;
  return `${URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST}/api/images${u}`;
}

/** The channel's logo, else its monogram on its own colour (as in the channel list). */
function Logo({ channel, className }: { channel: MediaItem; className: string }) {
  const [failed, setFailed] = useState(false);
  const src = logoUrl(channel);
  const name = nameOf(channel);
  return src && !failed ? (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-black/30 p-0.5 ${className}`}>
      <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain" onError={() => setFailed(true)} />
    </span>
  ) : (
    <span
      className={`flex shrink-0 items-center justify-center rounded-md font-bold text-white/90 ${className}`}
      style={{ background: `var(--ui-channel-monogram, hsl(${nameHue(name)} 35% 24%))` }}
    >
      {monogram(name)}
    </span>
  );
}

/** A show on now: its title over the channel's colour, the channel, how far through it is. */
function Tile({ card, at, onPlay }: { card: OnNow; at: number; onPlay: (c: MediaItem) => void }) {
  const name = nameOf(card.channel);
  const h = nameHue(name);
  return (
    <button
      type="button"
      data-focusable="true"
      onClick={() => onPlay(card.channel)}
      title={`${card.programme.name} · ${name}`}
      // Rests at 96 % and fills its slot on hover, so the row (which clips) never cuts it.
      className="flex aspect-16/10 w-full scale-[0.96] flex-col justify-between overflow-hidden rounded-xl p-3 text-left transition-transform duration-300 hover:scale-100 focus-visible:scale-100"
      style={{ background: `var(--ui-channel-tile, linear-gradient(160deg, hsl(${h} 40% 26%) 0%, hsl(${h} 30% 11%) 100%))` }}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Logo channel={card.channel} className="h-6 w-9 text-3xs" />
        <span className="truncate text-xs text-white/70">{name}</span>
      </span>
      <span className="block min-w-0">
        <span className="line-clamp-2 text-sm font-semibold leading-snug text-white">{card.programme.name}</span>
        <span className="mt-2 block h-0.5 overflow-hidden rounded-full bg-white/20">
          <span className="block h-full rounded-full bg-white/80" style={{ width: `${card.progress}%` }} />
        </span>
        <span className="mt-1 block text-2xs text-white/60">{leftOf(card.programme, at)} min left</span>
      </span>
    </button>
  );
}

/**
 * Live TV's "What's On", Netflix style: one show featured, then rows of what is on right now
 * (Your channels, Live sports, News, Movies...). Built in the browser from what Live TV already
 * holds (utils/channelRow whatsOn): no requests, recomputed once a minute while it is open.
 */
export default function WhatsOn({ channels, groups, epgData, now, favorites = [], recentChannels = [], onPlay }: WhatsOnProps) {
  const { hero, rows } = useMemo(
    () => whatsOn({ channels, groups, epg: epgData, at: now, favorites, recent: recentChannels }),
    [channels, groups, epgData, now, favorites, recentChannels],
  );

  if (!hero) {
    return <p className="px-3 py-16 text-center text-fg-muted">Nothing in the TV guide right now. Pick a category to browse channels.</p>;
  }

  const heroName = nameOf(hero.channel);
  const h = nameHue(heroName);
  const next = nowAndNext(epgData[String(hero.channel.id)], now).next;

  return (
    <div className="px-1 pb-32 pt-1">
      <section
        className="mb-8 overflow-hidden rounded-2xl p-6 sm:p-10"
        style={{ background: `var(--ui-channel-hero, radial-gradient(120% 140% at 90% 10%, hsl(${h} 45% 30%) 0%, transparent 60%), linear-gradient(180deg, hsl(${h} 25% 14%) 0%, hsl(${h} 20% 7%) 100%))` }}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 max-w-2xl text-left">
            <div className="flex items-center gap-2 text-sm text-white/75">
              <span className="ui-badge" data-tone="live">LIVE</span>
              <span className="truncate">
                {heroName}
                {hero.channel.number ? ` · ${hero.channel.number}` : ''}
              </span>
            </div>
            <h2 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-5xl">{hero.programme.name}</h2>
            {hero.programme.description && <p className="mt-3 line-clamp-2 max-w-xl text-white/70">{hero.programme.description}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/70">
              <span>
                {clock(hero.start)}–{clock(Number(hero.programme.stop_timestamp) * 1000)}
              </span>
              <span className="block h-1 w-32 overflow-hidden rounded-full bg-white/20">
                <span className="block h-full rounded-full bg-white/80" style={{ width: `${hero.progress}%` }} />
              </span>
              <span>{leftOf(hero.programme, now)} min left</span>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Button variant="primary" onClick={() => onPlay(hero.channel)}>
                <Play size={16} className="fill-current" /> Watch
              </Button>
              {next && (
                <span className="text-sm text-white/60">
                  Next at {clock(Number(next.start_timestamp) * 1000)} · {next.name}
                </span>
              )}
            </div>
          </div>
          <Logo channel={hero.channel} className="hidden h-16 w-24 text-xl sm:flex" />
        </div>
      </section>

      {rows.map((row) => (
        <MediaCardRow
          key={row.id}
          title={row.title}
          items={row.cards.map((c) => c.channel)}
          onClick={onPlay}
          loading={false}
          size="large"
          renderItem={(_, i) => <Tile card={row.cards[i]} at={now} onPlay={onPlay} />}
        />
      ))}
    </div>
  );
}
