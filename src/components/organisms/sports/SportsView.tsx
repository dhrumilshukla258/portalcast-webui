import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Search } from 'lucide-react';
import type { MediaItem } from '@/types';
import { getSports, type SportsAnswer, type SportsGame } from '@/api/endpoints/sports';
import { allChannels } from '@/utils/channelList';
import ChooseSports from './ChooseSports';
import { sportsDays, sportsOf, timeLabel, findQuery } from '@/utils/sportsLayout';

interface SportsViewProps {
  onPlayChannel: (channel: MediaItem) => void;
  /** "Find channel": search Live TV for the broadcaster the schedule names. */
  onFindChannel: (query: string) => void;
}

/**
 * The Sports page (plan Phase 6.7, the TV app's Sports tab): the next 7 days of the admin's
 * leagues by day, a chip per sport. A game the guide shows on a channel plays it; otherwise
 * "Find channel" searches Live TV for the broadcaster. Credit: "Schedule: sporting-events.org".
 */
const SportsView: React.FC<SportsViewProps> = ({ onPlayChannel, onFindChannel }) => {
  const [answer, setAnswer] = useState<SportsAnswer | null | undefined>(undefined);
  const [error, setError] = useState(false);
  const [channels, setChannels] = useState<Map<string, MediaItem>>(new Map());
  const [sport, setSport] = useState<string | null>(null);
  const [picking, setPicking] = useState<SportsGame | null>(null);
  const retries = useRef(0);
  const [choosing, setChoosing] = useState(false);

  const load = useCallback(async (fresh = false) => {
    setError(false);
    try {
      const [a, list] = await Promise.all([getSports(30, fresh), allChannels().catch(() => [] as MediaItem[])]);
      setAnswer(a);
      setChannels(new Map(list.map((c) => [String(c.id), c])));
      // The server's first fetch is still running: ask again shortly (a few times).
      if (a?.loading && retries.current++ < 3) setTimeout(() => void load(true), 4000);
    } catch {
      setError(true);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const games = useMemo(() => answer?.games ?? [], [answer]);
  // A chip per chosen league's sport, even one with no game this month (its next games show).
  const sports = useMemo(() => [...new Set([...(answer?.leagues ?? []).map((l) => l.sport), ...sportsOf(games)])], [answer, games]);
  const days = useMemo(() => sportsDays(games, sport), [games, sport]);
  const channelsOf = useCallback(
    (g: SportsGame) => g.channels.map((c) => channels.get(c.channelId)).filter((c): c is MediaItem => !!c),
    [channels]
  );

  const choose = (g: SportsGame) => {
    const on = channelsOf(g);
    if (on.length === 1) onPlayChannel(on[0]);
    else if (on.length > 1) setPicking(g);
    else onFindChannel(findQuery(g));
  };

  if (answer === undefined) {
    return error ? (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-gray-300">Couldn't load the schedule.</p>
        <button data-focusable="true" onClick={() => void load()} className="rounded-full bg-white px-5 py-2 font-bold text-[#0A0F1C]">Retry</button>
      </div>
    ) : (
      <div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-sky-400" /></div>
    );
  }
  if (answer === null) {
    return <p className="py-20 text-center text-gray-400">This server has no Sports page yet. Update the PortalCast server to get it.</p>;
  }
  const count = days.reduce((n, d) => n + d.games.length, 0);

  return (
    <div id="app-content-scroll" className="custom-scrollbar h-full min-h-0 overflow-y-auto px-3 pb-8 pt-3 sm:px-6 sm:pt-5">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-xl font-bold text-white sm:text-2xl">Sports</h2>
        <span className="text-sm text-gray-400">{count} {count === 1 ? 'game' : 'games'} in the next 30 days</span>
        <button
          data-focusable="true"
          onClick={() => setChoosing(true)}
          className="h-9 rounded-full border border-white/15 px-4 text-sm font-bold text-gray-200 hover:border-white/30"
        >
          Choose sports
        </button>
        <a href={answer.source.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-gray-500 hover:text-gray-300">
          Schedule: {answer.source.name}
        </a>
      </div>
      {sports.length > 1 && (
        // One scrolling line of chips on a phone, wrapping from sm up.
        <div className="hide-scrollbar mb-4 flex gap-2 overflow-x-auto sm:flex-wrap" data-focus-group="sports-chips">
          {[null, ...sports].map((s) => (
            <button
              key={s ?? 'all'}
              data-focusable="true"
              onClick={() => setSport(s)}
              className={`h-9 shrink-0 rounded-full px-4 text-sm font-bold transition-colors ${
                sport === s ? 'bg-sky-400 text-[#082F49]' : 'border border-white/10 bg-[#0b1120]/85 text-gray-300 hover:text-white'
              }`}
            >
              {s ?? 'All'}
            </button>
          ))}
        </div>
      )}
      {days.length === 0 && (
        <p className="py-16 text-center text-gray-400">
          {answer.loading ? 'Fetching the schedule…' : 'No games in the next 30 days for your leagues. Choose sports to add more.'}
        </p>
      )}
      {days.map((day) => (
        <section key={day.key} className="mb-6">
          <h3 className="mb-2 text-lg font-bold text-white">{day.label}</h3>
          <div className="space-y-2">
            {day.games.map((g) => (
              <GameRow key={g.id} game={g} channels={channelsOf(g)} onChoose={() => choose(g)} />
            ))}
          </div>
        </section>
      ))}
      {choosing && (
        <ChooseSports
          onClose={(saved) => {
            setChoosing(false);
            if (saved) { setSport(null); retries.current = 0; void load(true); }
          }}
        />
      )}
      {picking && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={() => setPicking(null)} data-focus-group="sports-picker">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1120] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white">{picking.title}</h3>
            <p className="mb-3 text-sm text-gray-400">The guide shows it on</p>
            <div className="space-y-2">
              {channelsOf(picking).map((c) => (
                <button
                  key={String(c.id)}
                  data-focusable="true"
                  onClick={() => { setPicking(null); onPlayChannel(c); }}
                  className="flex w-full items-center gap-3 rounded-xl bg-white/5 px-4 py-3 text-left font-bold text-white hover:bg-white/10"
                >
                  <Play className="h-4 w-4 fill-current" /> {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** Time (or LIVE) · the fixture and "League · City" · the channel, or the broadcasters and "Find channel". */
const GameRow: React.FC<{ game: SportsGame; channels: MediaItem[]; onChoose: () => void }> = ({ game, channels, onChoose }) => {
  const meta = [game.competition, game.venue].filter(Boolean).join(' · ');
  return (
    <button
      data-focusable="true"
      onClick={onChoose}
      className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-[#121A2B]/85 px-3 py-3 text-left transition-colors hover:bg-[#1E293B] focus:outline-hidden focus:ring-2 focus:ring-white sm:gap-4 sm:px-5 [&.focused]:ring-2 [&.focused]:ring-white"
    >
      <span className="w-16 shrink-0 sm:w-24">
        <span className={`block text-sm font-bold sm:text-base ${game.start === null ? 'text-gray-500' : 'text-white'}`}>{timeLabel(game)}</span>
        {game.live && <span className="mt-1 inline-block rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">LIVE</span>}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-white">{game.title}</span>
        {meta && <span className="block truncate text-xs text-gray-400 sm:text-sm">{meta}</span>}
        {/* On a phone the channel goes under the fixture; there is no room on the right. */}
        <span className="mt-1 block truncate text-xs sm:hidden">
          {channels.length > 0 ? (
            <span className="font-bold text-sky-400">▶ {channels[0].name}{channels.length > 1 ? ` +${channels.length - 1}` : ''}</span>
          ) : (
            <span className="text-gray-500">{game.broadcast.length ? `${game.broadcast.join(', ')} · ` : ''}Find channel</span>
          )}
        </span>
      </span>
      <span className="hidden max-w-[40%] shrink-0 text-right sm:block">
        {channels.length > 0 ? (
          <span className="block truncate text-sm font-bold text-sky-400">
            ▶ {channels[0].name}{channels.length > 1 ? `  +${channels.length - 1}` : ''}
          </span>
        ) : (
          <>
            {game.broadcast.length > 0 && <span className="block truncate text-xs text-gray-400">{game.broadcast.join(', ')}</span>}
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-gray-200">
              <Search className="h-3.5 w-3.5" /> Find channel
            </span>
          </>
        )}
      </span>
    </button>
  );
};

export default SportsView;
