import assert from 'node:assert/strict';
import test from 'node:test';
import { playbackPositionStorage } from '../src/utils/playbackPosition.ts';

test('a resume or cast position takes precedence and survives a provider reload', async () => {
  const storage = playbackPositionStorage(42, () => assert.fail('position was already supplied'));
  assert.equal(await storage.getTime(), 42);
  await storage.setTime(15); // The viewer sought backwards.
  await storage.setTime(0); // The replacement provider is loading.
  assert.equal(await storage.getTime(), 15);
  await storage.setTime(90, true);
  assert.equal(await storage.getTime(), 0);
});

test('a missing position waits for saved progress and a failed lookup starts at zero', async () => {
  let resolveTime;
  const slow = playbackPositionStorage(undefined, () => new Promise(resolve => { resolveTime = resolve; }));
  const time = slow.getTime();
  resolveTime(36);
  assert.equal(await time, 36);
  const offline = playbackPositionStorage(undefined, async () => { throw Error('offline'); });
  assert.equal(await offline.getTime(), 0);
});
