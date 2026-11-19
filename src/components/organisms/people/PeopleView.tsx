import React, { useCallback, useEffect, useRef, useState } from 'react';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import SearchField from '@/components/ui/SearchField';
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
      <div data-ui="page-bar" className="sticky top-0 z-30 -mx-3 mb-4 border-b border-white/5 bg-page px-3 pb-2 pt-2 sm:-mx-6 sm:px-6">
        {sectionChips?.(null)}
        {/* data-ui page-*: a theme can set the title and search side by side (Minimal). */}
        <div data-ui="page-head">
          <div className="mt-2 flex items-baseline gap-3 sm:mt-0">
            <h2 data-ui="page-title" className="text-xl font-bold text-fg sm:text-2xl">Cast</h2>
            {!hits && total > 0 && <span className="text-sm text-fg-muted">{total.toLocaleString()}</span>}
          </div>
          <div data-ui="page-search" className="mt-2">
            <SearchField
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClear={() => setQuery('')}
              placeholder="Search cast"
            />
          </div>
        </div>
        {!hits && (
          <div className="hide-scrollbar mt-2 flex gap-2 overflow-x-auto" data-focus-group="people-roles">
            {roles.map((r) => (
              <Chip key={r.id} selected={role === r.id} onClick={() => setRole(r.id)}>
                {r.label}
              </Chip>
            ))}
          </div>
        )}
      </div>

      {error && people.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-fg-soft">Couldn't load the cast.</p>
          <Button variant="primary" onClick={() => void load(role, 1)}>Retry</Button>
        </div>
      )}
      {first && !first.ready && <p className="py-16 text-center text-fg-muted">People are still being prepared on the server. Try again in a minute.</p>}
      {hits && hits.length === 0 && <p className="py-16 text-center text-fg-muted">No one by that name.</p>}

      <div data-ui="people-grid" className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
        {people.map((p) => (
          <PersonCard key={p.id} person={p} onOpen={() => openPerson?.(p.id)} />
        ))}
        {loading && people.length === 0 &&
          Array.from({ length: 14 }).map((_, i) => <div key={i} data-ui="person-photo" className="aspect-2/3 animate-pulse rounded-md bg-white/5 sm:rounded-xl" />)}
      </div>
      <div ref={sentinel} className="h-8" />
      {loading && people.length > 0 && (
        <div className="flex justify-center py-6"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-accent" /></div>
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
      data-ui="person-card"
      className="group text-left focus:outline-hidden"
    >
      <div data-ui="person-photo" className="relative aspect-2/3 w-full overflow-hidden rounded-md border border-line bg-panel-raised transition-all group-hover:border-accent/50 group-focus:ring-2 group-focus:ring-white group-[.focused]:ring-2 group-[.focused]:ring-white sm:rounded-xl">
        {src && !failed ? (
          <img src={src} alt={person.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={() => setFailed(true)} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white/30">
            {person.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
          </div>
        )}
      </div>
      <div className="mt-1.5 truncate text-xs font-semibold text-fg sm:text-sm">{person.name}</div>
      <div className="truncate text-2xs text-fg-subtle sm:text-xs">{person.knownFor}{person.titles > 0 ? ` · ${person.titles}` : ''}</div>
    </button>
  );
});

export default PeopleView;
