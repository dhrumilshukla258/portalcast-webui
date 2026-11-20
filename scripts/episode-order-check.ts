// Self-check for src/utils/episodeInfo.ts: node --experimental-strip-types scripts/episode-order-check.ts
import assert from 'node:assert/strict';
import { episodeTitle, inEpisodeOrder } from '../src/utils/episodeInfo.ts';
import type { MediaItem } from '../src/types/index.ts';

const ep = (name: string) => ({ name }) as MediaItem;
// An episode named after its show and season has no title of its own.
assert.equal(episodeTitle(ep('Episode 15. Two and a Half Men: Season 12'), 14, 'Two and a Half Men'), 'Episode 15');
assert.equal(episodeTitle(ep('Episode 13. Friends and Family'), 12, 'Lost'), 'Friends and Family');
assert.equal(episodeTitle(ep('Episode 4. Season Finale'), 3, 'Lost'), 'Season Finale');
// A whole season reads 1, 2, 3 whichever way it was listed; left alone when one has no number.
const names = (list: MediaItem[]) => list.map((e) => e.name);
assert.deepEqual(names(inEpisodeOrder([ep('Episode 52. A'), ep('Episode 51. B'), ep('Episode 3. C')])), ['Episode 3. C', 'Episode 51. B', 'Episode 52. A']);
assert.deepEqual(names(inEpisodeOrder([ep('Episode 2. A'), ep('Pilot')])), ['Episode 2. A', 'Pilot']);
console.log('episodeInfo: all checks passed');
