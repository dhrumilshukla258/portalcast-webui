import React from 'react';
import { Loader2, Star, Tv, Undo2 } from 'lucide-react';
import MediaCard from '@/components/molecules/MediaCard';
import { getMyList } from '@/api/endpoints/discover';
import { getWatchedTitles, getHiddenCards, setWatched, setNotInterested } from '@/api/endpoints/user';
import { allChannels } from '@/utils/channelList';
import { contentIdOf } from '@/utils/contentId';
import { markHidden } from '@/utils/hiddenTitles';
import { URL_PATHS } from '@/api/config';
import type { MediaItem } from '@/types';

type Section = 'list' | 'watched' | 'hidden' | 'channels';
const SECTIONS: { id: Section; label: string }[] = [
  { id: 'list', label: 'My List' },
  { id: 'watched', label: 'Watched' },
  { id: 'hidden', label: 'Not interested' },
  { id: 'channels', label: 'Favourite channels' },
];

interface MyListViewProps {
  onClick: (item: MediaItem) => void;
  loadingItemId: string | null;
  /** False while a title opened from here is shown over the page; read again when it closes. */
  active: boolean;
  /** Favourite channels (preferences) and the star toggle, from App. */
  favorites: string[];
  toggleFavorite: (channel: MediaItem) => void;
  onPlayChannel: (channel: MediaItem) => void;
  /** Something was undone: Home's rows come again. */
  onChanged: () => void;
}

/**
 * My List (owner, 2026-10-22: "access it in My List, so they can undo"): the saved titles,
 * the titles watched or marked watched (Not watched forgets them), the Not interested ones
 * (Show on Home again) and the favourite channels (remove the star). Read each time a section
 * opens, since they change from other pages and other devices.
 */
const MyListView: React.FC<MyListViewProps> = ({ onClick, loadingItemId, active, favorites, toggleFavorite, onPlayChannel, onChanged }) => {
  const [section, setSection] = React.useState<Section>('list');
  const [items, setItems] = React.useState<MediaItem[] | null>(null);
  const [channels, setChannels] = React.useState<MediaItem[] | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setFailed(false);
    if (section === 'channels') {
      allChannels().then(
        (all) => { if (!cancelled) setChannels(all); },
        () => { if (!cancelled) setFailed(true); }
      );
      return () => { cancelled = true; };
    }
    setItems(null);
    const load = section === 'list' ? getMyList : section === 'watched' ? getWatchedTitles : getHiddenCards;
    load().then(
      (list) => { if (!cancelled) setItems(list); },
      () => { if (!cancelled) setFailed(true); }
    );
    return () => { cancelled = true; };
  }, [active, section]);

  const undo = async (item: MediaItem) => {
    const id = contentIdOf(item);
    if (!id) return;
    if (section === 'watched') await setWatched(id, false);
    else { await setNotInterested(id, false); markHidden(id, false); }
    setItems((cur) => (cur ? cur.filter((x) => x.id !== item.id) : cur));
    onChanged();
  };

  const favChannels = channels ? channels.filter((c) => favorites.includes(String(c.id))) : null;
  const count = section === 'channels' ? favChannels?.length : items?.length;
  const empty: Record<Section, string> = {
    list: 'Nothing here yet. Choose "Add to My List" on a movie or series (or hold its poster) to keep it here.',
    watched: 'Titles you finish, or mark as watched from a poster\'s menu, show here.',
    hidden: 'Titles you mark Not interested from a poster\'s menu show here, so you can bring them back.',
    channels: 'Star channels in Live TV to keep them here.',
  };

  return (
    <div className="custom-scrollbar h-full min-h-0 flex-1 overflow-y-auto px-3 pb-10 pt-3 sm:px-6 sm:pt-5 tv-page">
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="text-xl font-bold text-white sm:text-2xl">My List</h2>
        {!!count && <span className="text-sm text-gray-400">{count}</span>}
      </div>
      <div className="hide-scrollbar mb-4 flex gap-2 overflow-x-auto" data-focus-group="mylist-sections">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            data-focusable="true"
            onClick={() => setSection(s.id)}
            className={`h-9 shrink-0 rounded-full px-4 text-sm font-bold transition-colors ${
              section === s.id ? 'bg-white text-[#05080F]' : 'border border-white/20 text-gray-200'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {failed ? (
        <p className="text-gray-400">This isn't available on this server yet.</p>
      ) : section === 'channels' ? (
        favChannels === null ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-white/60" /></div>
        ) : favChannels.length === 0 ? (
          <p className="text-gray-400">{empty.channels}</p>
        ) : (
          <div className="space-y-2">
            {favChannels.map((c) => <ChannelItem key={String(c.id)} channel={c} onPlay={onPlayChannel} onUnstar={() => toggleFavorite(c)} />)}
          </div>
        )
      ) : items === null ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-white/60" /></div>
      ) : items.length === 0 ? (
        <p className="text-gray-400">{empty[section]}</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 md:gap-6 lg:grid-cols-6 xl:grid-cols-7">
          {items.map((item) => (
            <div key={String(item.id)}>
              <MediaCard item={item} onClick={onClick} isLoading={loadingItemId === String(item.id)} posterOnlyOnPhone />
              {section !== 'list' && (
                <button
                  data-focusable="true"
                  onClick={() => void undo(item)}
                  className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-full border border-white/15 py-1.5 text-xs font-bold text-gray-200 hover:bg-white/10"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  {section === 'watched' ? 'Not watched' : 'Show on Home again'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ChannelItem: React.FC<{ channel: MediaItem; onPlay: (c: MediaItem) => void; onUnstar: () => void }> = ({ channel, onPlay, onUnstar }) => {
  const [failed, setFailed] = React.useState(false);
  const base = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
  const logo = channel.screenshot_uri || channel.stream_icon;
  const src = logo ? (logo.startsWith('http') ? logo : `${base}/api/images${logo}`) : null;
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
      <button data-focusable="true" onClick={() => onPlay(channel)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black/40">
          {src && !failed ? <img src={src} alt="" loading="lazy" className="max-h-full max-w-full object-contain" onError={() => setFailed(true)} /> : <Tv className="h-5 w-5 text-gray-500" />}
        </span>
        <span className="min-w-0 flex-1 truncate font-bold text-white">{channel.name}</span>
      </button>
      <button data-focusable="true" onClick={onUnstar} aria-label="Remove from favourites" title="Remove from favourites" className="flex h-9 w-9 items-center justify-center rounded-full text-amber-400 hover:bg-white/10">
        <Star className="h-5 w-5 fill-current" />
      </button>
    </div>
  );
};

export default MyListView;
