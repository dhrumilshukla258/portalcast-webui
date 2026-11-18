// Self-check for src/utils/seasonNumber.ts: node --experimental-strip-types scripts/season-number-check.ts
import assert from 'node:assert/strict';
import { seasonLabel, seasonNumberOf } from '../src/utils/seasonNumber.ts';

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
console.log('seasonNumber: all checks passed');
