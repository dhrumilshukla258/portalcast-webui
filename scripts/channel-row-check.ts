// Self-check for src/utils/channelRow.ts: node --experimental-strip-types scripts/channel-row-check.ts
import assert from 'node:assert/strict';
import { categoryKind, cleanChannelName, monogram, nowAndNext, titleCase, whatsOn } from '../src/utils/channelRow.ts';

assert.deepEqual(cleanChannelName('COLORS MARATHI HD'), { name: 'Colors Marathi', tags: ['HD'] });
assert.deepEqual(cleanChannelName('CineMania Marathi 1 FHD'), { name: 'CineMania Marathi 1', tags: ['FHD'] });
assert.deepEqual(cleanChannelName('ABP MAJHA NEWS'), { name: 'ABP Majha News', tags: [] });
assert.deepEqual(cleanChannelName('24 GHANTE TV'), { name: '24 Ghante TV', tags: [] });
assert.deepEqual(cleanChannelName('STAR SPORTS 4K UHD hevc'), { name: 'Star Sports', tags: ['4K', 'UHD', 'HEVC'] });
assert.deepEqual(cleanChannelName('HD'), { name: 'HD', tags: ['HD'] }); // never an empty name
assert.deepEqual(cleanChannelName('Discovery ID India 4K*'), { name: 'Discovery ID India', tags: ['4K'] });

assert.equal(monogram('CineMania Marathi 1'), 'CM');
assert.equal(monogram('9X Jhakaas'), '9X');
assert.equal(monogram('BBC News Marathi'), 'BBC');
assert.equal(monogram(''), '?');

const p = (a: number, b: number, name: string) => ({ start_timestamp: String(a), stop_timestamp: String(b), name });
const guide = [p(100, 200, 'Early'), p(200, 300, 'Show'), p(300, 400, 'Later')];
const nn = nowAndNext(guide, 250_000);
assert.equal(nn.now?.name, 'Show');
assert.equal(nn.next?.name, 'Later');
assert.equal(Math.round(nn.progress), 50);
assert.equal(nowAndNext(guide, 50_000).next?.name, 'Early'); // before the guide starts: nothing on, next known
assert.equal(nowAndNext(undefined, 0).now, null);
const filler = [p(100, 200, 'No details available'), p(200, 300, 'Real Show')];
assert.equal(nowAndNext(filler, 150_000).now, null); // filler: no programme
assert.equal(nowAndNext(filler, 150_000).next?.name, 'Real Show');
assert.equal(titleCase('HINDI | MOVIES & MUSIC 24/7'), 'Hindi | Movies & Music 24/7');
assert.equal(titleCase('ENGLISH USA'), 'English USA');
assert.equal(titleCase('ARGENTINE/BRAZIL'), 'Argentine/Brazil');
assert.equal(titleCase('SPORTS | DAZN & ESPN PPV'), 'Sports | DAZN & ESPN PPV');
assert.equal(cleanChannelName('NDTV 24X7').name, 'NDTV 24x7');
assert.equal(titleCase('Recent Channels'), 'Recent Channels'); // mixed case: as written
assert.equal(categoryKind('HINDI | NEWS'), 'news');
assert.equal(categoryKind('SPORTS 4K'), 'sports');
assert.equal(categoryKind('ENGLISH 4K'), 'uhd');
assert.equal(categoryKind('PUNJABI | RELIGIOUS'), 'religious');
assert.equal(categoryKind('HINDI | MOVIES & MUSIC 24/7'), 'movies');
assert.equal(categoryKind('CRICKET'), 'sports');
assert.equal(categoryKind('Favorites'), 'favorites');
assert.equal(categoryKind('All Channels'), 'all');
assert.equal(categoryKind('MARATHI'), 'region');
{
  const T = 1_000_000; // seconds
  const show = (name: string, from: number, to: number) => ({ start_timestamp: String(T + from), stop_timestamp: String(T + to), name });
  const ch = (id: string, number: string, name: string, tv_genre_id: string) => ({ id, number, name, tv_genre_id }) as never;
  const w = whatsOn({
    channels: [ch('1', '201', 'STAR SPORTS 1', 's'), ch('2', '202', 'STAR SPORTS 1 HINDI', 's'), ch('3', '101', 'ABP NEWS', 'hi'), ch('4', '310', 'ZEE CINEMA', 'mv'), ch('5', '999', 'NO GUIDE', 'hi')],
    groups: [{ id: 's', title: 'SPORTS' }, { id: 'hi', title: 'HINDI' }, { id: 'mv', title: 'HINDI | MOVIES' }],
    epg: {
      '1': [show('IND vs AUS', -600, 3000)],
      '2': [show('IND vs AUS', -600, 3000)],
      '3': [show('Prime Time', -300, 3300)],
      '4': [show('No details available', -60, 3000)],
    },
    at: T * 1000,
    favorites: ['3'],
  });
  const ids = (id: string) => w.rows.find((r) => r.id === id)?.cards.map((c) => c.channel.id);
  assert.deepEqual(ids('sports'), ['1']); // the same match on two channels: once
  assert.deepEqual(ids('news'), ['3']); // "ABP NEWS" in a language category: news by its name
  assert.deepEqual(ids('yours'), ['3']);
  assert.equal(ids('movies'), undefined); // only filler on the guide: no row
  assert.equal(w.hero?.channel.id, '1'); // a favorite that is not sports or a movie: the live sport leads
}
console.log('channelRow: all checks passed');
