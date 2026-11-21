// What a Live TV row shows from what it already has (no requests): the channel's name without
// its quality tags, those tags as badges, a monogram when there is no logo, and what is on now
// and next from the guide already loaded (useMediaLibrary's EPG window).
// Check: node --experimental-strip-types scripts/channel-row-check.ts
import type { EPG_List, MediaItem } from '@/types';

// A trailing * ("4K*", the provider's marker) is part of the tag, not the name.
const QUALITY = /^(FHD|UHD|HD|SD|4K|8K|HEVC|H265)\*?$/i;
// Guide entries that say nothing ("No details available"): shown as no programme.
const FILLER = /^(no (details|information|info|data|program(me)?( info(rmation)?)?)( available)?|to be announced|tba|n\/a)\.?$/i;

/**
 * "COLORS MARATHI HD" -> { name: "Colors Marathi", tags: ["HD"] }. Names in capitals become
 * title case; words of up to three letters stay as written (ABP, BBC, DD, TV, 9X).
 * Longer acronyms are kept from a short list (titleCase ACRONYMS).
 */
/**
 * Names typed in capitals in title case: "HINDI | MOVIES & MUSIC 24/7" -> "Hindi | Movies & Music 24/7".
 * Words of up to three letters stay as written (USA, UK, ABP, TV, PPV, 9X); mixed-case names stay.
 */
// Acronyms longer than three letters that IPTV names use; shorter words stay as written anyway.
const ACRONYMS = new Set(['DAZN', 'ESPN', 'NDTV', 'CNBC', 'CBBC', 'UEFA', 'FIFA', 'IPTV', 'UHD', 'HEVC']);

export function titleCase(raw: string): string {
  const words = raw.trim().split(/\s+/).filter(Boolean);
  const bare = words.join(' ');
  if (!/[A-Z]/.test(bare) || bare !== bare.toUpperCase()) return bare;
  // Each part of "ARGENTINE/BRAZIL" or "WORLD-WIDE" on its own.
  const part = (w: string) => (w.length <= 3 || ACRONYMS.has(w) ? w : w[0] + w.slice(1).toLowerCase());
  return words.map((w) => w.split(/([/-])/).map(part).join('')).join(' ');
}

export function cleanChannelName(raw: string): { name: string; tags: string[] } {
  const words = raw.trim().split(/\s+/).filter(Boolean);
  const tags = words.filter((w) => QUALITY.test(w)).map((w) => w.replace('*', '').toUpperCase());
  const rest = words.filter((w) => !QUALITY.test(w));
  const name = titleCase(rest.join(' '));
  return { name: name || raw.trim(), tags: [...new Set(tags)] };
}

export type CategoryKind =
  | 'recent' | 'favorites' | 'all' | 'news' | 'sports' | 'kids' | 'movies' | 'music'
  | 'religious' | 'docs' | 'premium' | 'uhd' | 'events' | 'radio' | 'region';

// First match wins, so "HINDI | NEWS" is news and "SPORTS 4K" sports; anything else (a language,
// a country) is a region.
const CATEGORY_KINDS: [CategoryKind, RegExp][] = [
  ['recent', /\brecent/],
  ['favorites', /\bfavou?rites?\b/],
  ['all', /^all channels$/],
  ['news', /\bnews\b/],
  ['events', /\b(ppv|pay ?per ?view|events?)\b/],
  ['sports', /\b(sports?|cricket|football|soccer|nba|nfl|nhl|mlb|ufc|wwe|f1|racing|golf|tennis)\b/],
  ['kids', /\b(kids?|cartoons?|junior|children)\b/],
  ['movies', /\b(movies?|cinema|films?)\b/],
  ['music', /\b(music|songs?|mtv)\b/],
  ['religious', /\b(religious|devotional|bhakti|bhajans?|spiritual|islamic|christian|gurbani|faith)\b/],
  ['docs', /\b(documentar(y|ies)|nature|discovery|science|history)\b/],
  ['premium', /\b(premium|vip)\b/],
  ['uhd', /\b(4k|uhd|8k)\b/],
  ['radio', /\bradio\b/],
];

/** What a Live TV category is about, for its icon. */
export function categoryKind(title: string): CategoryKind {
  const t = title.toLowerCase();
  return CATEGORY_KINDS.find(([, re]) => re.test(t))?.[0] ?? 'region';
}

/** "CineMania Marathi 1" -> "CM"; a short first word stands alone: "9X Jhakaas" -> "9X". */
export function monogram(name: string): string {
  const words = name.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w));
  if (words.length === 0) return '?';
  if (words[0].length <= 3) return words[0].toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/** A stable hue (0-359) for a name, so a channel's tile keeps its colour. */
export function nameHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 360;
}

export interface NowNext {
  now: EPG_List | null;
  next: EPG_List | null;
  /** 0-100 through the programme on now. */
  progress: number;
}

/** The programme on at `at` (ms) and the one after it. Timestamps are Unix seconds. */
export function nowAndNext(programs: EPG_List[] | undefined, at: number): NowNext {
  const empty = { now: null, next: null, progress: 0 };
  if (!programs?.length) return empty;
  const start = (p: EPG_List) => Number(p.start_timestamp) * 1000;
  const stop = (p: EPG_List) => Number(p.stop_timestamp) * 1000;
  const real = (p: EPG_List | undefined) => (p && !FILLER.test(p.name.trim()) ? p : null);
  const now = programs.find((p) => at >= start(p) && at < stop(p));
  if (!now || !real(now)) return { ...empty, next: real(programs.find((p) => start(p) > at)) };
  const next = real(programs.find((p) => start(p) >= stop(now)));
  const progress = Math.min(100, Math.max(0, ((at - start(now)) / (stop(now) - start(now))) * 100));
  return { now, next, progress };
}

export interface OnNow {
  channel: MediaItem;
  programme: EPG_List;
  /** 0-100 through the programme. */
  progress: number;
  /** When the programme started (ms). */
  start: number;
  kind: CategoryKind;
}

export interface WhatsOnRow {
  id: string;
  title: string;
  cards: OnNow[];
}

const MINUTE = 60_000;

/**
 * Live TV's "What's On": everything on right now as Netflix-style rows, plus one show to feature.
 * Only from what is already in memory (channels, their categories, the guide window, favorites,
 * recents): no requests. A channel's kind is its category's (categoryKind), else its own name's
 * ("ABP NEWS" in a language category is news). A show on several channels (one match in three
 * languages) is shown once per row.
 */
export function whatsOn(args: {
  channels: MediaItem[];
  groups: { id: string | number; title: string }[];
  epg: Record<string, EPG_List[]>;
  at: number;
  favorites?: string[];
  recent?: string[];
  perRow?: number;
}): { hero: OnNow | null; rows: WhatsOnRow[] } {
  const { channels, groups, epg, at, favorites = [], recent = [], perRow = 20 } = args;
  const groupTitle = new Map(groups.map((g) => [String(g.id), g.title]));
  const mine = [...recent, ...favorites].map(String);
  const live: (OnNow & { mine: number })[] = [];
  const seen = new Set<string>();
  for (const channel of channels) {
    const id = String(channel.id);
    if (seen.has(id)) continue;
    seen.add(id);
    const { now, progress } = nowAndNext(epg[id], at);
    if (!now) continue;
    let kind = categoryKind(groupTitle.get(String(channel.tv_genre_id)) ?? '');
    if (kind === 'region' || kind === 'all' || kind === 'premium' || kind === 'uhd') kind = categoryKind(channel.name || channel.title || '');
    live.push({ channel, programme: now, progress, start: Number(now.start_timestamp) * 1000, kind, mine: mine.indexOf(id) });
  }
  const byNumber = (a: OnNow, b: OnNow) => (Number(a.channel.number) || Infinity) - (Number(b.channel.number) || Infinity);
  const row = (id: string, title: string, pick: (o: OnNow & { mine: number }) => boolean, order: (a: OnNow & { mine: number }, b: OnNow & { mine: number }) => number = byNumber): WhatsOnRow | null => {
    const shows = new Set<string>();
    const cards = live
      .filter(pick)
      .sort(order)
      .filter((o) => {
        const key = o.programme.name.trim().toLowerCase();
        if (shows.has(key)) return false;
        shows.add(key);
        return true;
      })
      .slice(0, perRow);
    return cards.length ? { id, title, cards } : null;
  };
  const rows = [
    row('yours', 'Your channels', (o) => o.mine >= 0, (a, b) => a.mine - b.mine),
    row('sports', 'Live sports', (o) => o.kind === 'sports' || o.kind === 'events'),
    row('news', 'News', (o) => o.kind === 'news'),
    row('movies', 'Movies on now', (o) => o.kind === 'movies'),
    row('started', 'Just started', (o) => at - o.start < 15 * MINUTE, (a, b) => b.start - a.start),
    row('kids', 'Kids', (o) => o.kind === 'kids'),
    row('docs', 'Documentaries', (o) => o.kind === 'docs'),
    row('music', 'Music', (o) => o.kind === 'music'),
  ].filter((r): r is WhatsOnRow => r !== null);
  const pick = (id: string) => rows.find((r) => r.id === id)?.cards ?? [];
  const hero =
    pick('yours').find((c) => c.kind === 'sports' || c.kind === 'events' || c.kind === 'movies') ??
    pick('sports')[0] ??
    pick('yours')[0] ??
    rows[0]?.cards[0] ??
    null;
  return { hero, rows };
}
