// Self-check for src/utils/seasonNumber.ts: node --experimental-strip-types scripts/season-number-check.ts
import assert from 'node:assert/strict';
import { seasonLabel, seasonNumberOf } from '../src/utils/seasonNumber.ts';
import { episodeTitle, inEpisodeOrder, runtimeText } from '../src/utils/episodeInfo.ts';
import type { MediaItem } from '../src/types/index.ts';

const s = (season_number: string | number | undefined, name = '', title = '') => ({ season_number, name, title });

assert.equal(seasonNumberOf(s('7', 'Season 1. Mylanchi S07'), 0), 7); // the server's number wins over the title
assert.equal(seasonNumberOf(s(3), 0), 3);
assert.equal(seasonNumberOf(s('0', 'Specials'), 0), 0);
assert.equal(seasonNumberOf(s(undefined, 'Lost: Season 2'), 0), 2);
assert.equal(seasonNumberOf(s('', 'Mylanchi S07'), 4), 7);
assert.equal(seasonNumberOf(s(undefined, '24'), 2), 3); // a show called "24": its place, not 24
assert.equal(seasonNumberOf(s(undefined, '9-1-1'), 0), 1);
assert.equal(seasonNumberOf(s(undefined, 'The 100'), 1), 2);
assert.equal(seasonNumberOf(s('abc', 'Season 5'), 0), 5); // junk number: the name
assert.equal(seasonLabel(0), 'Specials');
assert.equal(seasonLabel(4), 'Season 4');
// An episode named after its show and season has no title of its own.
const ep = (name: string) => ({ name }) as MediaItem;
assert.equal(episodeTitle(ep('Episode 15. Two and a Half Men: Season 12'), 14, 'Two and a Half Men'), 'Episode 15');
assert.equal(episodeTitle(ep('Episode 13. Friends and Family'), 12, 'Lost'), 'Friends and Family');
assert.equal(episodeTitle(ep('Episode 4. Season Finale'), 3, 'Lost'), 'Season Finale');
// A whole season reads 1, 2, 3 whichever way it was listed; left alone when one has no number.
const names = (list: MediaItem[]) => list.map((e) => e.name);
assert.deepEqual(names(inEpisodeOrder([ep('Episode 52. A'), ep('Episode 51. B'), ep('Episode 3. C')])), ['Episode 3. C', 'Episode 51. B', 'Episode 52. A']);
assert.deepEqual(names(inEpisodeOrder([ep('Episode 2. A'), ep('Pilot')])), ['Episode 2. A', 'Pilot']);
assert.equal(runtimeText(125), '2h 5m');
assert.equal(runtimeText(7500), '2h 5m'); // seconds
assert.equal(runtimeText(0), null);
console.log('seasonNumber: all checks passed');
