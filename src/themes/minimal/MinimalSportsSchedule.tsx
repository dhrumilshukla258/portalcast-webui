import { useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronRight, ListVideo, Play, Search, Tv } from 'lucide-react';
import type { SportsGame } from '@/api/endpoints/sports';
import type { SportsScheduleProps } from '@/components/organisms/sports/SportsView';
import type { MediaItem } from '@/types';
import { splitLiveSchedule, timeLabel } from '@/utils/sportsLayout';

function Fixture({ game, channels, onChoose }: {
  game: SportsGame;
  channels: MediaItem[];
  onChoose: (game: SportsGame) => void;
}) {
  const multiple = channels.length > 1;
  let Icon = Search;
  let action = 'Find channel';
  let station = game.broadcast.join(', ');
  if (multiple) {
    Icon = ListVideo;
    action = `${channels.length} channels`;
    station = '';
  } else if (channels.length === 1) {
    Icon = game.live ? Play : Tv;
    action = game.live ? 'Watch live' : 'Open channel';
    station = channels[0].name ?? '';
  }
  const location = game.venue.split(',')[0].trim();
  const details = [game.competition || game.sport, location].filter(Boolean).join(' · ');
  const actionLabel = (
    <span className="inline-flex items-center gap-1.5">
      <Icon aria-hidden="true" size={16} />
      {action}
      {multiple && <ChevronRight aria-hidden="true" size={14} />}
    </span>
  );

  if (game.live) {
    return (
      <button type="button" data-focusable="true" onClick={() => onChoose(game)}
        className="ui-row flex w-[88%] min-w-0 shrink-0 snap-start flex-col items-start rounded-2xl p-4 text-left only:w-full sm:w-auto sm:p-5">
        <span className="flex w-full items-baseline justify-between gap-3 text-xs font-medium text-fg-muted">
          <span>{details}</span>
          <span className="shrink-0 tabular-nums">{timeLabel(game)}</span>
        </span>
        <span className="my-3 block text-xl leading-tight font-semibold tracking-tight text-fg">{game.title}</span>
        <span className="mt-auto flex w-full flex-wrap items-center gap-x-3 gap-y-1 pt-1">
          <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${channels.length ? 'bg-fg text-page' : 'bg-panel-hover text-fg-soft'}`}>
            {actionLabel}
          </span>
          {station && <span className="min-w-0 truncate text-xs text-fg-muted">{station}</span>}
        </span>
      </button>
    );
  }

  return (
    <button type="button" data-focusable="true" onClick={() => onChoose(game)}
      className="grid w-full grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-x-2 rounded-lg px-1 py-3 text-left hover:bg-panel focus-visible:outline-2 focus-visible:outline-focus sm:grid-cols-[6rem_minmax(0,1fr)_minmax(8rem,14rem)] sm:items-center sm:gap-x-4 sm:px-3">
      <span className="row-span-2 text-xs font-semibold whitespace-nowrap text-fg-soft tabular-nums sm:row-auto sm:text-sm">
        {timeLabel(game)}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold leading-snug text-fg">{game.title}</span>
        {details && <span className="block text-xs text-fg-muted">{details}</span>}
      </span>
      <span className="col-start-2 mt-1 min-w-0 text-xs font-medium text-fg-soft sm:col-start-auto sm:mt-0 sm:text-right">
        {actionLabel}
        {station && <span className="block truncate font-normal text-fg-muted" title={station}>{station}</span>}
      </span>
    </button>
  );
}

export default function MinimalSportsSchedule({ days, channelsOf, onChoose, summary, manageLeagues, filters, credit, empty }: SportsScheduleProps) {
  const { live, schedule } = useMemo(() => splitLiveSchedule(days, (game) => channelsOf(game).length > 0), [days, channelsOf]);
  const [date, setDate] = useState('');
  const selectedDay = schedule.find((day) => day.key === date);
  const fixture = (game: SportsGame) => <Fixture key={game.id} game={game} channels={channelsOf(game)} onChoose={onChoose} />;

  return (
    <div className="mx-auto max-w-6xl text-left" onKeyDown={(e) => { if (e.key === 'Enter') e.stopPropagation(); }}>
      <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
        <div>
          <h2 className="text-3xl leading-tight font-bold text-fg">Sports</h2>
          <p className="mt-1 text-xs text-fg-muted sm:text-sm">{summary} on your schedule</p>
        </div>
        {manageLeagues}
      </div>
      {filters}
      {empty}
      {live.length > 0 && (
        <section aria-labelledby="sports-live" className="mt-6">
          <h3 id="sports-live" className="mb-3 flex items-center gap-2.5 text-xl font-semibold text-fg">
            <span aria-hidden="true" className="size-2 rounded-full bg-live" />
            Live now
          </h3>
          <div className="hide-scrollbar flex snap-x gap-2.5 overflow-x-auto p-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:p-0">
            {live.map(fixture)}
          </div>
        </section>
      )}
      {schedule.length > 0 && (
        <section aria-labelledby="sports-schedule" className="mt-7">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 id="sports-schedule" className="text-xl font-semibold text-fg">Schedule</h3>
            {schedule.length > 1 && (
              <label className="relative inline-flex items-center text-xs font-medium text-fg-soft">
                <CalendarDays aria-hidden="true" size={15} className="pointer-events-none absolute left-3" />
                <select aria-label="Schedule date" data-focusable="true" value={selectedDay?.key ?? ''}
                  onChange={(e) => setDate(e.target.value)} onKeyDown={(e) => e.stopPropagation()}
                  className="h-9 cursor-pointer appearance-none rounded-full border border-line-strong bg-page pr-8 pl-9 focus-visible:outline-2 focus-visible:outline-focus">
                  <option value="">All dates</option>
                  {schedule.map((day) => <option key={day.key} value={day.key}>{day.label}</option>)}
                </select>
                <ChevronDown aria-hidden="true" size={14} className="pointer-events-none absolute right-3" />
              </label>
            )}
          </div>
          {(selectedDay ? [selectedDay] : schedule).map((day) => (
            <section key={day.key} className="mb-5">
              <h4 className="flex items-baseline gap-2 border-b border-line-strong pb-2 text-sm font-semibold text-fg">
                {day.label}
                <span className="text-xs font-normal text-fg-muted">{day.games.length} {day.games.length === 1 ? 'game' : 'games'}</span>
              </h4>
              <div className="divide-y divide-line">{day.games.map(fixture)}</div>
            </section>
          ))}
        </section>
      )}
      <footer className="mt-6 border-t border-line pt-3">{credit}</footer>
    </div>
  );
}
