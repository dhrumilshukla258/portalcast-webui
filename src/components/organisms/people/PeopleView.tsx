import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { getPeople, searchPeople, type PeopleRole, type PeoplePage, type PersonHit } from '@/api/endpoints/discover';
import { useOpenPerson } from '@/context/PersonPageContext';

const ROLES: { id: PeopleRole; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'actor', label: 'Actors' },
  { id: 'actress', label: 'Actresses' },
  { id: 'director', label: 'Directors' },
  { id: 'creator', label: 'Creators' },
  { id: 'writer', label: 'Writers' },
];

interface PeopleViewProps {
  /** Phone: the Movies · Series · People chips row (App). */
  sectionChips?: (filterButton: React.ReactNode) => React.ReactNode;
}

/**
 * The People tab (server: GET /api/v2/people): cast and crew with photos, most popular first,
 * a chip per role (Actors / Actresses appear once the server knows genders), a search box
 * (people search). A person opens their page, which lists what can be played.
 */
// Pages already seen, per role, kept on this device: Cast shows them at once when it opens
// again (or a role is chosen again) while page 1 is refreshed.
const seen = new Map<PeopleRole, PeoplePage[]>();
let lastRole: PeopleRole = 'all';

const PeopleView: React.FC<PeopleViewProps> = ({ sectionChips }) => {
  const openPerson = useOpenPerson();
  const [role, setRole] = useState<PeopleRole>(lastRole);
  const [pages, setPages] = useState<PeoplePage[]>(seen.get(lastRole) ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<PersonHit[] | null>(null);
  const request = useRef(0);

  const load = useCallback(async (r: PeopleRole, page: number) => {
    const id = ++request.current;
    setLoading(true);
    setError(false);
    try {
      const p = await getPeople(r, page);
      if (request.current !== id) return;
      setPages((prev) => {
        const next = page === 1 ? [p] : [...prev, p];
        seen.set(r, next);
        return next;
      });
    } catch {
      if (request.current === id) setError(true);
    } finally {
      if (request.current === id) setLoading(false);
    }
  }, []);
  useEffect(() => {
    lastRole = role;
    setPages(seen.get(role) ?? []);
    void load(role, 1);
  }, [role, load]);

  // Search as you type (people search, from the server's memory).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setHits(null); return; }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      searchPeople(q, ctrl.signal).then((r) => setHits(r.people)).catch(() => {});
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query]);

  const first = pages[0];
  // ?? []: an answer without a list (an older or failing server) must not take the page down.
  const people = hits ?? pages.flatMap((p) => p?.data ?? []);
  const total = first?.total ?? 0;
  const hasMore = !hits && people.length < total;

  // Next page when the end of the grid comes near.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !loading) void load(role, pages.length + 1);
    }, { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, load, role, pages.length]);

  const counts = first?.counts;
  const roles = ROLES.filter((r) => !counts || r.id === 'all' || counts[r.id] > 0);

  return (
    <div id="app-content-scroll" className="custom-scrollbar h-full min-h-0 overflow-y-auto px-3 pb-10 sm:px-6 tv-page">
      <div className="sticky top-0 z-30 -mx-3 mb-4 border-b border-white/5 bg-[#05080F] px-3 pb-2 pt-2 sm:-mx-6 sm:px-6">
        {sectionChips?.(null)}
        <div className="mt-2 flex items-baseline gap-3 sm:mt-0">
          <h2 className="text-xl font-bold text-white sm:text-2xl">Cast</h2>
          {!hits && total > 0 && <span className="text-sm text-gray-400">{total.toLocaleString()}</span>}
        </div>
        <label className="mt-2 flex h-10 items-center gap-2 rounded-full border border-white/10 bg-[#0b1120] px-4">
          <SearchIcon className="h-4 w-4 shrink-0 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actors, directors…"
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-hidden placeholder:text-gray-500"
            data-focusable="true"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear" className="text-gray-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        {!hits && (
          <div className="hide-scrollbar mt-2 flex gap-2 overflow-x-auto" data-focus-group="people-roles">
            {roles.map((r) => (
              <button
                key={r.id}
                data-focusable="true"
                onClick={() => setRole(r.id)}
                className={`h-9 shrink-0 rounded-full px-4 text-sm font-bold transition-colors ${
                  role === r.id ? 'bg-sky-400 text-[#082F49]' : 'border border-white/10 bg-[#0b1120] text-gray-300 hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && people.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-gray-300">Couldn't load the cast.</p>
          <button data-focusable="true" onClick={() => void load(role, 1)} className="rounded-full bg-white px-5 py-2 font-bold text-[#0A0F1C]">Retry</button>
        </div>
      )}
      {first && !first.ready && <p className="py-16 text-center text-gray-400">People are still being prepared on the server. Try again in a minute.</p>}
      {hits && hits.length === 0 && <p className="py-16 text-center text-gray-400">No one by that name.</p>}

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
        {people.map((p) => (
          <PersonCard key={p.id} person={p} onOpen={() => openPerson?.(p.id)} />
        ))}
        {loading && people.length === 0 &&
          Array.from({ length: 14 }).map((_, i) => <div key={i} className="aspect-2/3 animate-pulse rounded-md bg-white/5 sm:rounded-xl" />)}
      </div>
      <div ref={sentinel} className="h-8" />
      {loading && people.length > 0 && (
        <div className="flex justify-center py-6"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-sky-400" /></div>
      )}
    </div>
  );
};

/** A person as a poster: photo 2:3, name and what they are known for under it. */
const PersonCard: React.FC<{ person: PersonHit; onOpen: () => void }> = React.memo(({ person, onOpen }) => {
  const [failed, setFailed] = useState(false);
  // People search sends w185 (round faces); a poster-sized card wants w342.
  const src = person.photo ? person.photo.replace('/w185/', '/w342/') : null;
  return (
    <button
      type="button"
      data-focusable="true"
      onClick={onOpen}
      title={`${person.name}: all titles`}
      className="group text-left focus:outline-hidden"
    >
      <div className="relative aspect-2/3 w-full overflow-hidden rounded-md border border-white/10 bg-[#121A2B] transition-all group-hover:border-sky-400/50 group-focus:ring-2 group-focus:ring-white group-[.focused]:ring-2 group-[.focused]:ring-white sm:rounded-xl">
        {src && !failed ? (
          <img src={src} alt={person.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={() => setFailed(true)} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white/30">
            {person.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
          </div>
        )}
      </div>
      <div className="mt-1.5 truncate text-xs font-semibold text-gray-100 sm:text-sm">{person.name}</div>
      <div className="truncate text-[11px] text-gray-500 sm:text-xs">{person.knownFor}{person.titles > 0 ? ` · ${person.titles}` : ''}</div>
    </button>
  );
});

export default PeopleView;
