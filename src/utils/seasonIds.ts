/**
 * True when a season in a series' list is the season [wanted] names. A show the provider lists
 * one season at a time is served as one show (server: content/seasonParts.ts), and its seasons'
 * ids name the provider seasons they come from ("m:7:574273.7~515872.1"), so progress saved
 * before that, with a provider season id ("1"), still finds its season.
 */
export function seasonMatches(listId: unknown, wanted: unknown): boolean {
  const id = String(listId ?? '');
  const want = String(wanted ?? '');
  if (!want) return false;
  if (id === want) return true;
  const m = /^m:\d+:(.+)$/.exec(id);
  if (!m) return false;
  return m[1].split(/[~+ ]/).some((piece) => piece.slice(piece.indexOf('.') + 1) === want);
}
