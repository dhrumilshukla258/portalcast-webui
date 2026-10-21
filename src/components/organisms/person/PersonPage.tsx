import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { getPerson, type CreditRole, type PersonPage as PersonPageData } from '@/api/endpoints/discover';
import MediaCard from '@/components/molecules/MediaCard';
import type { MediaItem } from '@/types';

interface PersonPageProps {
  id: number;
  onClose: () => void;
  /** Opens a title the way a Discover card does (version picker, then the detail page). */
  onOpenTitle: (item: MediaItem) => void;
  loadingItemId?: string | null;
}

/** "Ip Man" for a character, "Director" for a job. */
function roleText(roles: CreditRole[] | undefined): string {
  return (roles ?? [])
    .map((r) => (r.role && r.role.trim()) || r.kind.charAt(0).toUpperCase() + r.kind.slice(1))
    .join(' · ');
}

/** "12 March 1963" from "1963-03-12"; the raw value when it does not parse. */
function formatDate(value: string): string {
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * A cast or crew member's page over everything else: photo, what they are known for,
 * birth date and place, biography, and every title of theirs in the catalog (newest
 * first) with their role in each. Back, Escape or the close button returns to the
 * title it was opened from.
 */
const PersonPage: React.FC<PersonPageProps> = ({ id, onClose, onOpenTitle, loadingItemId }) => {
  const [data, setData] = useState<PersonPageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bioOpen, setBioOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setData(null);
    setError(null);
    setBioOpen(false);
    getPerson(id, ctrl.signal)
      .then(setData)
      .catch((e) => {
        if (!ctrl.signal.aborted) setError(e?.response?.status === 404 ? 'This person is not in the catalog.' : 'Could not load this person.');
      });
    return () => ctrl.abort();
  }, [id]);

  // Back (TV remote 10009, Backspace) and Escape close the page before the app's own Back
  // handling sees them; the browser Back button closes it too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
      if (e.key === 'Escape' || e.keyCode === 10009 || (e.keyCode === 8 && !typing)) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    const onPop = () => onClose();
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('popstate', onPop);
    };
  }, [onClose]);

  useEffect(() => {
    closeRef.current?.focus();
  }, [id]);

  const p = data?.person;
  const facts = p
    ? [
        p.knownFor && `Known for ${p.knownFor}`,
        p.birthday && `Born ${formatDate(p.birthday)}${p.placeOfBirth ? ` in ${p.placeOfBirth}` : ''}`,
        p.deathday && `Died ${formatDate(p.deathday)}`,
      ].filter(Boolean) as string[]
    : [];

  return (
    <div
      className="animate-fade-in fixed inset-0 z-90 overflow-y-auto bg-black/95 custom-scrollbar"
      role="dialog"
      aria-modal="true"
      aria-label={p?.name || 'Person'}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          data-focusable="true"
          className="mb-6 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white focus:outline-hidden focus:ring-2 focus:ring-portalcast-light"
        >
          <ArrowLeft size={16} /> Back
        </button>

        {!data && !error && (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-white/60" />
          </div>
        )}
        {error && <p className="py-24 text-center text-gray-400">{error}</p>}

        {p && data && (
          <div className="flex flex-col gap-8 md:flex-row">
            <aside className="w-full shrink-0 md:w-72">
              {p.photo ? (
                <img src={p.photo} alt={p.name} className="mx-auto aspect-2/3 w-48 rounded-2xl object-cover shadow-2xl md:w-full" />
              ) : (
                <div className="mx-auto flex aspect-2/3 w-48 items-center justify-center rounded-2xl bg-white/10 text-5xl font-black text-gray-500 md:w-full">
                  {p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                </div>
              )}
              <h1 className="mt-5 text-2xl font-black leading-tight text-white md:text-3xl">{p.name}</h1>
              <div className="mt-2 space-y-1 text-sm text-gray-400">
                {facts.map((f) => (
                  <p key={f}>{f}</p>
                ))}
                <p>
                  {data.credits.length} {data.credits.length === 1 ? 'title' : 'titles'} here
                </p>
              </div>
              {p.biography && (
                <div className="mt-4">
                  <p className={`whitespace-pre-line text-sm leading-relaxed text-gray-300 ${bioOpen ? '' : 'line-clamp-8'}`}>{p.biography}</p>
                  {p.biography.length > 500 && (
                    <button
                      type="button"
                      onClick={() => setBioOpen((v) => !v)}
                      data-focusable="true"
                      className="mt-1 rounded px-1 text-xs font-bold text-portalcast-light hover:underline focus:outline-hidden focus:ring-2 focus:ring-portalcast-light"
                    >
                      {bioOpen ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>
              )}
            </aside>

            <section className="min-w-0 flex-1">
              {data.credits.length === 0 ? (
                <p className="text-gray-400">Nothing of theirs in the catalog yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {data.credits.map((item) => {
                    const role = roleText(item.roles);
                    return (
                      <div key={item.id} className="min-w-0">
                        <MediaCard item={item as MediaItem} onClick={onOpenTitle} isLoading={loadingItemId === item.id} />
                        <p className="mt-1.5 truncate px-1 text-xs text-gray-400" title={role}>
                          {[item.year, role].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonPage;
