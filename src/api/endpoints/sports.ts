import { api } from '@/api/client';

/**
 * `GET /api/v2/sports?days=` (servers from 2026-10-22): upcoming games of the leagues the admin
 * chose, from sporting-events.org (credited on the page), with the channels the guide shows
 * them on (strict: both teams named at kick-off). Channel ids only: names come from the
 * channel list.
 */
export interface SportsGame {
  id: string;
  league: string;
  competition: string;
  sport: string;
  /** UTC date, "2026-10-24". */
  date: string;
  /** Kick-off in ms since the epoch; null when the time is not known yet. */
  start: number | null;
  title: string;
  home: string;
  away: string;
  venue: string;
  status: string;
  broadcast: string[];
  url: string;
  live: boolean;
  channels: { channelId: string; programme: string }[];
}

export interface SportsAnswer {
  source: { name: string; url: string };
  updatedAt: number | null;
  /** True while the server's first fetch is still running: ask again shortly. */
  loading: boolean;
  /** False when the server has no current guide, so no game can show a channel. */
  guide: boolean;
  leagues: { id: string; name: string; sport: string; url: string }[];
  games: SportsGame[];
}

export interface SportsLeagues {
  leagues: { id: string; name: string; sport: string }[];
  /** The viewer's leagues (the admin's when they have not chosen). */
  chosen: string[];
  defaults: string[];
  max: number;
}

/** `GET /api/v2/sports/leagues`: every league there is, and the viewer's choice. */
export const getSportsLeagues = async (): Promise<SportsLeagues> =>
  (await api.get<SportsLeagues>('/v2/sports/leagues')).data;

/** Null when the server has no Sports page (older servers answer 404). */
export const getSports = async (days = 30, fresh = false): Promise<SportsAnswer | null> => {
  try {
    // fresh: right after the viewer changed their leagues (the answer is cached 2 minutes).
    return (await api.get<SportsAnswer>('/v2/sports', { params: fresh ? { days, t: Date.now() } : { days } })).data ?? null;
  } catch (e) {
    if ((e as { response?: { status?: number } })?.response?.status === 404) return null;
    throw e;
  }
};
