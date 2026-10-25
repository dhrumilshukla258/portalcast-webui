/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Heart } from 'lucide-react';
import { URL_PATHS } from '@/api/config';
import type { ChannelGroup, EPG_List, MediaItem } from '@/types';

// The TV apps' Live TV, as the Android TV app's (ui/live/LiveScreen.kt): groups down the left
// (Recent, Favourites, All, then the provider's), the group's channels in the middle (number,
// logo, name, what is on with a progress bar, what is next), and what is on the focused channel
// on the right (not focusable). OK plays; holding OK adds or removes a favourite.
//
// A provider can have 10,000+ channels: the list draws only the rows around the focused one, in
// a box as tall as the whole list (rows at fixed offsets), so moving and scrolling stay cheap.

const ROW = 78; // 72 high + 6 between, as the Android TV app
const AROUND = 14; // rows drawn above and below the focused one
const RECENT = 'recent', FAVS = 'fav', ALL = '*';

const base = () => (URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST);
const imageOf = (p?: string | null) => (!p ? null : p.startsWith('http') ? p : `${base()}/api/images${p}`);
const secs = (s: string) => Number(s) * 1000;
const clock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function nowNext(list: EPG_List[] | undefined, now: number): [EPG_List | null, EPG_List | null] {
  if (!list?.length) return [null, null];
  const i = list.findIndex((p) => secs(p.start_timestamp) <= now && now < secs(p.stop_timestamp));
  if (i < 0) return [null, list.find((p) => secs(p.start_timestamp) > now) ?? null];
  return [list[i], list[i + 1] ?? null];
}
const progressOf = (p: EPG_List, now: number) => {
  const a = secs(p.start_timestamp), b = secs(p.stop_timestamp);
  return b > a ? Math.min(100, Math.max(0, ((now - a) / (b - a)) * 100)) : 0;
};

interface Props {
  channels: MediaItem[];
  groups: ChannelGroup[];
  epg: Record<string, EPG_List[]>;
  favorites: string[];
  recentChannels: string[];
  onPlay: (channel: MediaItem) => void;
  onToggleFavorite: (channel: MediaItem) => void;
}

const TvLiveScreen: React.FC<Props> = ({ channels, groups, epg, favorites, recentChannels, onPlay, onToggleFavorite }) => {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);

  const allGroups = React.useMemo(() => [
    { id: RECENT, title: 'Recent' }, { id: FAVS, title: 'Favourites' }, { id: ALL, title: 'All' },
    // Not the provider's "all" group, nor the browser list's own Recent / Favorites / All (useMediaLibrary).
    ...groups.filter((g) => !['*', '0', 'all', 'recent', 'fav'].includes(String(g.id)) && !/^all$/i.test(String(g.title).trim())),
  ], [groups]);
  const [groupId, setGroupId] = React.useState<string>(() => (recentChannels.length ? RECENT : ALL));

  const favSet = React.useMemo(() => new Set(favorites.map(String)), [favorites]);
  const visible = React.useMemo(() => {
    if (groupId === RECENT) {
      const byId = new Map(channels.map((c) => [String(c.id), c]));
      return [...new Set(recentChannels.map(String))].map((id) => byId.get(id)).filter(Boolean) as MediaItem[];
    }
    if (groupId === FAVS) return channels.filter((c) => favSet.has(String(c.id)));
    if (groupId === ALL) return channels;
    return channels.filter((c) => String((c as any).tv_genre_id) === groupId);
  }, [channels, groupId, recentChannels, favSet]);

  const [focusIdx, setFocusIdx] = React.useState(0);
  const [focused, setFocused] = React.useState<MediaItem | null>(null);
  React.useEffect(() => { setFocusIdx(0); }, [groupId]);
  const from = Math.max(0, focusIdx - AROUND), to = Math.min(visible.length, focusIdx + AROUND + 1);
  const title = allGroups.find((g) => g.id === groupId)?.title ?? 'Live TV';

  return (
    <div className="flex h-full min-h-0 pt-6">
      <div className="hide-scrollbar h-full w-[210px] shrink-0 overflow-y-auto pb-8 pl-5 pr-2" data-tv-group="live-groups">
        {allGroups.map((g) => {
          const active = g.id === groupId;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setGroupId(g.id)}
              data-focusable="true"
              data-active={active ? 'true' : undefined}
              tabIndex={-1}
              className={`mb-1 block w-full truncate rounded-[10px] px-4 py-2.5 text-left text-[15px] font-semibold ${active ? 'bg-[#1E293B] text-white' : 'text-slate-400'}`}
            >
              {g.title}
            </button>
          );
        })}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-baseline px-4 pb-2">
          <h1 className="flex-1 truncate text-left text-[24px] font-semibold text-slate-100">{title}</h1>
          <span className="text-[14px] text-slate-400">{visible.length} channels</span>
        </div>
        {visible.length === 0 ? (
          <p className="px-4 pt-6 text-left text-[15px] text-slate-400">
            {groupId === FAVS ? 'No favourites yet. Hold OK on a channel to add it.' : groupId === RECENT ? 'Channels you watch will show up here.' : 'No channels in this group.'}
          </p>
        ) : (
          <div key={groupId} className="hide-scrollbar relative min-h-0 flex-1 overflow-y-auto px-2 pb-8">
            <div className="relative" style={{ height: visible.length * ROW }} data-tv-group="channels">
              {visible.slice(from, to).map((c, k) => {
                const i = from + k;
                return (
                  <ChannelRow
                    key={String(c.id)}
                    channel={c}
                    top={i * ROW}
                    epg={epg[String(c.id)]}
                    now={now}
                    favorite={favSet.has(String(c.id))}
                    onPlay={onPlay}
                    onToggleFavorite={onToggleFavorite}
                    onFocused={() => { setFocusIdx(i); setFocused(c); }}
                    first={i === 0}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Details channel={focused} epg={focused ? epg[String(focused.id)] : undefined} now={now} favorite={!!focused && favSet.has(String(focused.id))} groups={allGroups} />
    </div>
  );
};

const ChannelRow: React.FC<{
  channel: MediaItem; top: number; epg?: EPG_List[]; now: number; favorite: boolean;
  onPlay: (c: MediaItem) => void; onToggleFavorite: (c: MediaItem) => void; onFocused: () => void; first?: boolean;
}> = React.memo(({ channel, top, epg, now, favorite, onPlay, onToggleFavorite, onFocused, first }) => {
  const [cur, next] = nowNext(epg, now);
  const logo = imageOf((channel as any).logo || channel.screenshot_uri);
  const [logoFailed, setLogoFailed] = React.useState(false);
  const name = channel.name || channel.title || `Channel ${channel.id}`;
  return (
    <button
      type="button"
      onClick={() => onPlay(channel)}
      onContextMenu={(e) => { e.preventDefault(); onToggleFavorite(channel); }}
      onFocus={onFocused}
      data-focusable="true"
      data-default-focus={first ? 'true' : undefined}
      tabIndex={-1}
      className="absolute inset-x-0 flex h-[72px] items-center rounded-[12px] border border-white/10 bg-white/[0.06] px-2.5 text-left"
      style={{ top }}
    >
      <span className="w-11 shrink-0 text-right text-[14px] font-medium text-slate-400">{(channel as any).number ?? ''}</span>
      <span className="ml-2.5 flex h-10 w-[60px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/[0.06]">
        {logo && !logoFailed ? <img src={logo} alt="" loading="lazy" className="h-full w-full object-contain p-0.5" onError={() => setLogoFailed(true)} /> : <span className="text-[16px] font-semibold text-slate-400">{name.trim().charAt(0).toUpperCase()}</span>}
      </span>
      <span className="ml-3 min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[16px] font-semibold text-slate-100">{name}</span>
          {favorite && <Heart className="h-3.5 w-3.5 shrink-0 fill-red-400 text-red-400" />}
        </span>
        {cur && (
          <span className="mt-0.5 flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-[13px] text-slate-200/85">{cur.name || 'Untitled programme'}</span>
            <span className="h-[3px] w-14 shrink-0 overflow-hidden rounded-full bg-white/20"><span className="block h-full bg-sky-400" style={{ width: `${progressOf(cur, now)}%` }} /></span>
          </span>
        )}
        {next && <span className="mt-0.5 block truncate text-[13px] text-slate-400">Next {clock(secs(next.start_timestamp))} · {next.name || 'Untitled programme'}</span>}
      </span>
    </button>
  );
});

const Details: React.FC<{ channel: MediaItem | null; epg?: EPG_List[]; now: number; favorite: boolean; groups: { id: string; title: string }[] }> = ({ channel, epg, now, favorite, groups }) => {
  if (!channel) return <div className="w-[300px] shrink-0 pr-6 pt-12 text-left text-[15px] text-slate-400">Pick a channel to see what's on.</div>;
  const [cur, next] = nowNext(epg, now);
  const group = groups.find((g) => g.id === String((channel as any).tv_genre_id))?.title;
  const meta = [group, (channel as any).number ? `Ch ${(channel as any).number}` : null].filter(Boolean).join('  ·  ');
  const later = epg && cur ? epg.slice(epg.indexOf(cur) + 2, epg.indexOf(cur) + 4) : [];
  return (
    <div className="w-[300px] shrink-0 overflow-hidden pb-6 pr-6 pt-12 text-left">
      <h2 className="line-clamp-2 text-[22px] font-bold text-white">{channel.name || channel.title}</h2>
      <p className="mt-1 flex items-center gap-2 text-[14px] text-slate-400">{meta}{favorite && <Heart className="h-4 w-4 fill-red-400 text-red-400" />}</p>
      {cur ? (
        <div className="mt-6">
          <p className="text-[12px] font-bold tracking-wider text-sky-400">NOW</p>
          <p className="mt-1 line-clamp-2 text-[17px] font-semibold text-slate-100">{cur.name || 'Untitled programme'}</p>
          <p className="mt-1 text-[13px] text-slate-400">{clock(secs(cur.start_timestamp))} – {clock(secs(cur.stop_timestamp))}</p>
          <span className="mt-2 block h-1 overflow-hidden rounded-full bg-white/20"><span className="block h-full bg-sky-400" style={{ width: `${progressOf(cur, now)}%` }} /></span>
          {cur.description && <p className="mt-3 line-clamp-5 text-[13px] leading-[1.5] text-slate-300">{cur.description}</p>}
        </div>
      ) : (
        <p className="mt-6 text-[13px] text-slate-400">No guide information for this channel.</p>
      )}
      {next && (
        <div className="mt-5">
          <p className="text-[12px] font-bold tracking-wider text-sky-400">NEXT</p>
          {[next, ...later].map((p, i) => (
            <p key={i} className="mt-1 truncate text-[13px] text-slate-300"><span className="text-slate-500">{clock(secs(p.start_timestamp))}</span>  {p.name}</p>
          ))}
        </div>
      )}
      <p className="mt-6 text-[12px] text-slate-500">Press OK to watch · Hold OK: favourite</p>
    </div>
  );
};

export default TvLiveScreen;
