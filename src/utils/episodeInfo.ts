import type { MediaItem } from '@/types';

/**
 * Episode numbers, titles and air dates that hold up on real portals — the same rules as
 * the TV app's EpisodeInfo.kt, so both clients show an episode the same way.
 *
 * Stalker portals put the number only in the name ("Episode 13. Friends and Family"),
 * daily soaps put the air date there too ("2026-05-26 - Kamini Secretly…",
 * "Episode 1294. 25-07-2026 : Ep. 1294 - A Tough Time For Pushpa"), and some episodes
 * are named after the show itself ("2026-05-30 - Kamali").
 */

const SXXEYY = /\bS\d{1,2}\s*E(\d{1,4})\b/i;
const LEADING_EPISODE = /^\s*(?:episode|ep\.?|e)\s*(\d{1,4})\s*(?:[.:\-–—)]\s*)?/i;
const LEADING_NUMBER = /^\s*(\d{1,4})\s*[.:\-–—)]\s+/;
const ISO_DATE = /^\s*((?:19|20)\d{2})-(\d{1,2})-(\d{1,2})\s*(?:[.:\-–—|]\s*)?/;
const DMY_DATE = /^\s*(\d{1,2})[-./](\d{1,2})[-./]((?:19|20)\d{2})\s*(?:[.:\-–—|]\s*)?/;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_WORD = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
// "October 19, 2026" / "19 October 2026"
const MDY_WORDS = new RegExp(`^\\s*${MONTH_WORD}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+((?:19|20)\\d{2})\\s*(?:[.:\\-–—|]\\s*)?`, 'i');
const DMY_WORDS = new RegExp(`^\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH_WORD}\\.?,?\\s+((?:19|20)\\d{2})\\s*(?:[.:\\-–—|]\\s*)?`, 'i');
const monthIndex = (word: string) => MONTHS.findIndex((m) => word.toLowerCase().startsWith(m.toLowerCase()));

/** "Kamali - October 19, 2026" -> "October 19, 2026": a show-name prefix says nothing. */
function withoutShowName(name: string, seriesTitle?: string): string {
  const show = seriesTitle?.trim();
  if (!show) return name;
  const lower = name.toLowerCase();
  if (!lower.startsWith(show.toLowerCase())) return name;
  const rest = name.slice(show.length);
  return /^\s*[-–—:|]/.test(rest) ? rest.replace(/^\s*[-–—:|]\s*/, '') : name;
}

function rawName(ep: MediaItem): string {
  return String(ep.title || ep.name || '').trim();
}

function afterNumber(name: string): string {
  return name.replace(SXXEYY, ' ').replace(LEADING_EPISODE, '').replace(LEADING_NUMBER, '').trim();
}

/** The episode's number: from its name, then episode_num, then its position (1-based). */
export function episodeNumber(ep: MediaItem, fallbackIndex: number): number {
  const name = rawName(ep);
  for (const re of [SXXEYY, LEADING_EPISODE, LEADING_NUMBER]) {
    const m = re.exec(name);
    if (m) return Number(m[1]);
  }
  const n = Number(ep.episode_num);
  return n > 0 ? n : fallbackIndex + 1;
}

/** "26 May 2026" when the name starts with an air date (after any episode prefix). */
export function episodeAirDate(ep: MediaItem, seriesTitle?: string): string | null {
  const rest = withoutShowName(afterNumber(rawName(ep)), seriesTitle);
  const words = MDY_WORDS.exec(rest);
  if (words) return `${Number(words[2])} ${MONTHS[monthIndex(words[1])]} ${words[3]}`;
  const wordsDmy = DMY_WORDS.exec(rest);
  if (wordsDmy) return `${Number(wordsDmy[1])} ${MONTHS[monthIndex(wordsDmy[2])]} ${wordsDmy[3]}`;
  let day: number, month: number, year: string;
  const iso = ISO_DATE.exec(rest);
  const dmy = iso ? null : DMY_DATE.exec(rest);
  if (iso) { year = iso[1]; month = Number(iso[2]); day = Number(iso[3]); }
  else if (dmy) { day = Number(dmy[1]); month = Number(dmy[2]); year = dmy[3]; }
  else return null;
  return month >= 1 && month <= 12 && day >= 1 && day <= 31 ? `${day} ${MONTHS[month - 1]} ${year}` : null;
}

/**
 * The title without its number prefix and leading air date; "Episode N" when nothing
 * meaningful is left, including a name that is only the show's own name.
 */
export function episodeTitle(ep: MediaItem, fallbackIndex: number, seriesTitle?: string): string {
  let rest = withoutShowName(afterNumber(rawName(ep)), seriesTitle);
  rest = rest.replace(ISO_DATE, '').replace(DMY_DATE, '').replace(MDY_WORDS, '').replace(DMY_WORDS, '');
  rest = rest.replace(LEADING_EPISODE, '').replace(LEADING_NUMBER, '');
  const stripped = rest.replace(/\s+/g, ' ').trim().replace(/^[-–—:.|\s]+/, '');
  const isShowName = !!seriesTitle && stripped.toLowerCase() === seriesTitle.trim().toLowerCase();
  return !stripped || isShowName ? `Episode ${episodeNumber(ep, fallbackIndex)}` : stripped;
}

/** "21m", "1h 5m" from minutes or seconds-ish values; null when unknown. */
export function episodeRuntime(ep: MediaItem): string | null {
  const raw = Number((ep as { time?: unknown }).time ?? 0) || Number(ep.duration ?? 0);
  if (!raw || raw <= 0) return null;
  const minutes = raw > 600 ? Math.round(raw / 60) : raw; // seconds when implausibly long for minutes
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
