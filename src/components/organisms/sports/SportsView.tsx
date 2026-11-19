import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play, Search, X } from 'lucide-react';
import type { MediaItem } from '@/types';
import { getSports, type SportsAnswer, type SportsGame } from '@/api/endpoints/sports';
import { allChannels } from '@/utils/channelList';
import ChooseSports from './ChooseSports';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import { usePart } from '@/themes/registry';
import { useVisiblePoll } from '@/hooks/useVisiblePoll';
import { type SportsDay, sportsDays, sportsOf, timeLabel, findQuery } from '@/utils/sportsLayout';

interface SportsViewProps {
  onPlayChannel: (channel: MediaItem) => void;
  /** "Find channel": search Live TV for the broadcaster the schedule names. */
  onFindChannel: (query: string) => void;
}

export interface SportsScheduleProps {
  days: SportsDay[];
  channelsOf: (game: SportsGame) => MediaItem[];
  onChoose: (game: SportsGame) => void;
  summary: string;
  manageLeagues: React.ReactNode;
  filters: React.ReactNode;
  credit: React.ReactNode;
  empty: React.ReactNode;
}

// The last answer, kept on this device: going back to Sports shows it at once while a fresh
// one loads (owner: tabs from the client's cache, not a wait on the server).
let lastAnswer: SportsAnswer | null | undefined;
let lastChannels = new Map<string, MediaItem>();

const SportsView: React.FC<SportsViewProps> = ({ onPlayChannel, onFindChannel }) => {
  const Schedule = usePart('SportsSchedule', ClassicSportsSchedule);
  const [answer, setAnswer] = useState<SportsAnswer | null | undefined>(lastAnswer);
  const [error, setError] = useState(false);
  const [channels, setChannels] = useState<Map<string, MediaItem>>(lastChannels);
  const [sport, setSport] = useState<string | null>(null);
  const [picking, setPicking] = useState<SportsGame | null>(null);
  const retries = useRef(0);
  const requestId = useRef(0);
  const [choosing, setChoosing] = useState(false);

  const load = useCallback(async (fresh = false) => {
    const id = ++requestId.current;
    setError(false);
    try {
      const [a, list] = await Promise.all([getSports(30, fresh), allChannels().catch(() => [] as MediaItem[])]);
      if (id !== requestId.current) return;
      setAnswer(a);
      lastAnswer = a;
      lastChannels = new Map(list.map((c) => [String(c.id), c]));
      setChannels(lastChannels);
    } catch {
      if (id === requestId.current) setError(true);
    }
  }, []);
  // The guide caches live status for two minutes. Refresh while the viewer is browsing.
  useVisiblePoll(() => load(), 120_000);
  useEffect(() => () => { requestId.current++; }, []);
  useEffect(() => {
    if (!answer?.loading || retries.current >= 3) return;
    const timer = setTimeout(() => {
      if (document.hidden) return;
      retries.current++;
      void load(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, [answer, load]);

  const games = useMemo(() => answer?.games ?? [], [answer]);
  // A chip per chosen league's sport, even one with no game this month (its next games show).
  const sports = useMemo(() => [...new Set([...(answer?.leagues ?? []).map((l) => l.sport), ...sportsOf(games)])], [answer, games]);
  const days = useMemo(() => sportsDays(games, sport), [games, sport]);
  const channelsOf = useCallback(
    (g: SportsGame) => g.channels.map((c) => channels.get(c.channelId)).filter((c): c is MediaItem => !!c),
    [channels]
  );

  const pickerTrigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (picking) return () => pickerTrigger.current?.focus({ preventScroll: true });
  }, [picking]);

  const choose = (g: SportsGame) => {
    const on = channelsOf(g);
    if (on.length === 1) onPlayChannel(on[0]);
    else if (on.length > 1) {
      pickerTrigger.current = document.activeElement as HTMLElement | null;
      setPicking(g);
    } else onFindChannel(findQuery(g));
  };

  if (answer === undefined) {
    return error ? (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-fg-soft">Couldn't load the schedule.</p>
        <Button variant="primary" onClick={() => void load()}>Retry</Button>
      </div>
    ) : (
      <div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-accent" /></div>
    );
  }
  if (answer === null) {
    return <p className="py-20 text-center text-fg-muted">This server has no Sports page yet. Update the PortalCast server to get it.</p>;
  }
  const count = days.reduce((n, d) => n + d.games.length, 0);

  return (
    <div id="app-content-scroll" className="custom-scrollbar h-full min-h-0 overflow-y-auto px-3 pb-8 pt-3 sm:px-6 sm:pt-5 tv-page">
      <Schedule
        days={days}
        channelsOf={channelsOf}
        onChoose={choose}
        summary={`${count} ${count === 1 ? 'game' : 'games'}`}
        manageLeagues={<Button onClick={() => setChoosing(true)}>Choose sports</Button>}
        filters={sports.length > 1 && (
          <div className="hide-scrollbar mb-4 flex gap-2 overflow-x-auto sm:flex-wrap" role="group" aria-label="Filter by sport" data-focus-group="sports-chips">
            {[null, ...sports].map((s) => (
              <Chip key={s ?? 'all'} selected={sport === s} onClick={() => setSport(s)}>
                {s ?? 'All'}
              </Chip>
            ))}
          </div>
        )}
        credit={(
          <a href={answer.source.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-fg-subtle hover:text-fg-soft">
            Schedule: {answer.source.name}{answer.guide ? ' and your TV guide' : ''}
          </a>
        )}
        empty={days.length === 0 && (
          <p role="status" className="py-16 text-center text-fg-muted">
            {answer.loading ? 'Fetching the schedule…' : 'No games in the next 30 days for your leagues. Choose sports to add more.'}
          </p>
        )}
      />
      {choosing && (
        <ChooseSports
          onClose={(saved) => {
            setChoosing(false);
            if (saved) { setSport(null); retries.current = 0; void load(true); }
          }}
        />
      )}
      {picking && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={() => setPicking(null)} data-focus-group="sports-picker">
          <div
            role="dialog" aria-modal="true" aria-labelledby="sports-channel-title"
            className="flex max-h-full w-full max-w-md flex-col rounded-2xl border border-line bg-panel p-5 text-left"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { e.stopPropagation(); setPicking(null); }
              if (e.key === 'Enter') e.stopPropagation();
              if (e.key !== 'Tab') return;
              const buttons = e.currentTarget.querySelectorAll('button');
              const first = buttons[0];
              const last = buttons[buttons.length - 1];
              if (e.shiftKey && e.target === first) { e.preventDefault(); last.focus(); }
              if (!e.shiftKey && e.target === last) { e.preventDefault(); first.focus(); }
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 id="sports-channel-title" className="text-lg font-bold text-fg">{picking.title}</h3>
              <button type="button" data-focusable="true" aria-label="Close channel picker" onClick={() => setPicking(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-fg-muted hover:bg-panel-hover">
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            <p className="mb-3 text-sm text-fg-muted">The guide shows it on</p>
            <div className="custom-scrollbar space-y-2 overflow-y-auto p-1">
              {channelsOf(picking).map((c, i) => (
                <button
                  key={String(c.id)}
                  autoFocus={i === 0}
                  data-focusable="true"
                  onClick={() => { setPicking(null); onPlayChannel(c); }}
                  className="flex w-full items-center gap-3 rounded-xl bg-white/5 px-4 py-3 text-left font-bold text-fg hover:bg-interaction"
                >
                  <Play className="h-4 w-4 fill-current" /> {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const ClassicSportsSchedule: React.FC<SportsScheduleProps> = ({ days, channelsOf, onChoose, summary, manageLeagues, filters, credit, empty }) => (
  <>
    <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h2 className="text-xl font-bold text-fg sm:text-2xl">Sports</h2>
      <span className="text-sm text-fg-muted">{summary} in the next 30 days</span>
      {manageLeagues}
      {credit}
    </div>
    {filters}
    {empty}
    {days.map((day) => (
      <section key={day.key} className="mb-6">
        <h3 className="mb-2 text-lg font-bold text-fg">{day.label}</h3>
        <div className="space-y-2">
          {day.games.map((g) => (
            <GameRow key={g.id} game={g} channels={channelsOf(g)} onChoose={() => onChoose(g)} />
          ))}
        </div>
      </section>
    ))}
  </>
);

/** Time (or LIVE) · the fixture and "League · City" · the channel, or the broadcasters and "Find channel". */
const GameRow: React.FC<{ game: SportsGame; channels: MediaItem[]; onChoose: () => void }> = ({ game, channels, onChoose }) => {
  const meta = [game.competition, game.venue].filter(Boolean).join(' · ');
  return (
    <button
      data-focusable="true"
      onClick={onChoose}
      className="ui-row flex w-full items-center gap-3 px-3 py-3 text-left sm:gap-4 sm:px-5"
    >
      <span className="w-16 shrink-0 sm:w-24">
        <span className={`block text-sm font-bold sm:text-base ${game.start === null ? 'text-fg-subtle' : 'text-fg'}`}>{timeLabel(game)}</span>
        {game.live && <span className="ui-badge mt-1" data-tone="live">LIVE</span>}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-fg">{game.title}</span>
        {meta && <span className="block truncate text-xs text-fg-muted sm:text-sm">{meta}</span>}
        {/* On a phone the channel goes under the fixture; there is no room on the right. */}
        <span className="mt-1 block truncate text-xs sm:hidden">
          {channels.length > 0 ? (
            <span className="font-bold text-accent">▶ {channels[0].name}{channels.length > 1 ? ` +${channels.length - 1}` : ''}</span>
          ) : (
            <span className="text-fg-subtle">{game.broadcast.length ? `${game.broadcast.join(', ')} · ` : ''}Find channel</span>
          )}
        </span>
      </span>
      <span className="hidden max-w-[40%] shrink-0 text-right sm:block">
        {channels.length > 0 ? (
          <span className="block truncate text-sm font-bold text-accent">
            ▶ {channels[0].name}{channels.length > 1 ? `  +${channels.length - 1}` : ''}
          </span>
        ) : (
          <>
            {game.broadcast.length > 0 && <span className="block truncate text-xs text-fg-muted">{game.broadcast.join(', ')}</span>}
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-fg-soft">
              <Search className="h-3.5 w-3.5" /> Find channel
            </span>
          </>
        )}
      </span>
    </button>
  );
};

export default SportsView;
