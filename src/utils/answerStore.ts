// Server answers kept in the browser (IndexedDB), so pages opened before (Home's rows, a series'
// seasons and episodes, category pages, Live TV's channels) show at once after the tab was
// closed; api/responseCache.ts then asks the server again and swaps in a changed answer (owner,
// 2026-10-22: the same as the TV app's DiskCache). Keyed by user and server, so another account
// or server never sees them; cleared on sign-out. Bounded: beyond MAX_ENTRIES the oldest go.
// Everything here fails quietly (private windows, storage turned off): the app then simply
// asks the server, as before.

const DB_NAME = 'portalcast-answers';
const STORE = 'answers';
const MAX_ENTRIES = 400;

interface Row { k: string; at: number; json: string }

let dbPromise: Promise<IDBDatabase | null> | null = null;

/** Opens the database; a copy without our store (left by anything else) is upgraded to add it. */
function open(version?: number): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = version ? indexedDB.open(DB_NAME, version) : indexedDB.open(DB_NAME);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          const store = req.result.createObjectStore(STORE, { keyPath: 'k' });
          store.createIndex('at', 'at');
        }
      };
      req.onsuccess = () => {
        const d = req.result;
        if (d.objectStoreNames.contains(STORE)) return resolve(d);
        const next = d.version + 1;
        d.close();
        open(next).then(resolve);
      };
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function db(): Promise<IDBDatabase | null> {
  dbPromise ??= open();
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return db().then((d) => new Promise<T | undefined>((resolve) => {
    if (!d) return resolve(undefined);
    try {
      const tx = d.transaction(STORE, mode);
      const req = work(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => resolve(undefined);
      tx.onabort = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  }));
}

/** The stored answer's JSON text, or undefined. */
export async function readAnswer(key: string): Promise<string | undefined> {
  const row = await run<Row | undefined>('readonly', (s) => s.get(key) as IDBRequest<Row | undefined>);
  return row?.json;
}

let writes = 0;

export async function writeAnswer(key: string, json: string): Promise<void> {
  await run('readwrite', (s) => { s.put({ k: key, at: Date.now(), json } satisfies Row); });
  if (++writes % 25 === 0) void trim();
}

async function trim(): Promise<void> {
  const count = await run<number>('readonly', (s) => s.count());
  if (!count || count <= MAX_ENTRIES) return;
  let excess = count - Math.floor(MAX_ENTRIES * 0.8);
  await run('readwrite', (s) => {
    const cursor = s.index('at').openCursor();
    cursor.onsuccess = () => {
      const c = cursor.result;
      if (!c || excess <= 0) return;
      c.delete();
      excess--;
      c.continue();
    };
  });
}

export async function clearAnswers(): Promise<void> {
  await run('readwrite', (s) => { s.clear(); });
}
