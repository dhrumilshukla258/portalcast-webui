import assert from 'node:assert/strict';
import test from 'node:test';
import { splitLiveSchedule } from '../src/utils/sportsLayout.ts';

test('live games from either side of midnight appear once and empty dates drop out', () => {
  const yesterday = { id: 'late', live: true };
  const today = { id: 'early', live: true };
  const upcoming = { id: 'later', live: false };
  const days = [
    { key: '2026-11-17', label: 'Tue', games: [yesterday] },
    { key: '2026-11-18', label: 'Today', games: [today, upcoming] },
  ];
  const hasChannel = (game) => game === today;
  assert.deepEqual(splitLiveSchedule(days, hasChannel), {
    live: [today, yesterday],
    schedule: [{ ...days[1], games: [upcoming] }],
  });
  assert.equal(days[1].games.length, 2);
  assert.deepEqual(splitLiveSchedule([], hasChannel), { live: [], schedule: [] });
});
