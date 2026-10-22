import type { SportsGame } from '@/api/endpoints/sports';

/** The Sports page's grouping and labels (the TV app's SportsLayout). */

export interface SportsDay {
  key: string;
  label: string;
  games: SportsGame[];
}

/** The sports in the answer, in first-seen order. */
export const sportsOf = (games: SportsGame[]): string[] => [...new Set(games.map((g) => g.sport).filter(Boolean))];

/** The viewer's day for a game, "2026-10-24": kick-off in local time; no time keeps its date. */
export function localDay(game: SportsGame): string {
  if (game.start === null) return game.date;
  const d = new Date(game.start);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dayLabel(day: string, now = new Date()): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Games of `sport` (null: all) by the viewer's day, live games first within a day. */
export function sportsDays(games: SportsGame[], sport: string | null): SportsDay[] {
  const byDay = new Map<string, SportsGame[]>();
  for (const g of games) {
    if (sport && g.sport !== sport) continue;
    const key = localDay(g);
    const list = byDay.get(key);
    if (list) list.push(g);
    else byDay.set(key, [g]);
  }
  return [...byDay.keys()].sort().map((key) => ({
    key,
    label: dayLabel(key),
    games: [...byDay.get(key)!].sort((a, b) => Number(b.live) - Number(a.live)),
  }));
}

/** "15:00" in the viewer's clock, or "Time TBC". */
export const timeLabel = (game: SportsGame): string =>
  game.start === null ? 'Time TBC' : new Date(game.start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

/** What "Find channel" searches Live TV for: the first broadcaster, without "(US)"-style notes. */
export function findQuery(game: SportsGame): string {
  for (const b of game.broadcast) {
    const q = b.replace(/\s*\([^)]*\)/g, '').trim();
    if (q.length >= 2) return q;
  }
  return game.title;
}
