import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { X, Search } from 'lucide-react';
import { searchMatches, getPortalTitleMatch, setPortalTitleMatch } from '@/api/endpoints/admin';
import type { TmdbCandidate, PortalTitleMatch } from '@/api/types/admin';

const errorText = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;

const btn =
  'flex items-center justify-center gap-1.5 rounded-lg border border-gray-700 px-3 py-2 text-xs font-bold text-gray-200 hover:bg-gray-800 disabled:opacity-50';

/**
 * "Fix match": search TMDB (or paste an IMDb/TMDB id or link) and pick the right title. Used by
 * the local library (Admin → Libraries) and by portal titles (detail page, admins only).
 */
export const FixMatchDialog: React.FC<{
  name: string;
  year: string | null;
  kind: 'movie' | 'series';
  /** Shown under the heading (a folder path, the portal's name). */
  subtitle?: string;
  currentTmdbId: number | null;
  locked: boolean;
  /** Saves the choice (null: match automatically); resolves with the success message. */
  onChoose: (tmdbId: number | null) => Promise<string>;
  onClose: () => void;
}> = ({ name, year: initialYear, kind, subtitle, currentTmdbId, locked, onChoose, onClose }) => {
  const [q, setQ] = useState(name);
  const [year, setYear] = useState(initialYear ?? '');
  const [results, setResults] = useState<TmdbCandidate[] | null>(null);
  const [busy, setBusy] = useState(false);
  const search = useCallback(async () => {
    setResults(null);
    try {
      setResults(await searchMatches(q, year || null, kind));
    } catch (err) {
      toast.error(errorText(err, 'TMDB search failed'));
      setResults([]);
    }
  }, [q, year, kind]);
  useEffect(() => {
    void search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const choose = async (tmdbId: number | null) => {
    setBusy(true);
    try {
      toast.success(await onChoose(tmdbId));
      onClose();
    } catch (err) {
      toast.error(errorText(err, 'Could not save the match'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Fix match</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-800" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {subtitle && <p className="mb-3 truncate font-mono text-xs text-gray-500">{subtitle}</p>}
        <form
          className="mb-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Title, or an IMDb / TMDB id or link"
            className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-950/60 px-3 py-2 text-sm text-gray-100 outline-none focus:border-blue-500"
          />
          <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="Year" className="w-20 rounded-lg border border-gray-700 bg-gray-950/60 px-3 py-2 text-sm text-gray-100 outline-none focus:border-blue-500" />
          <button type="submit" className={btn}><Search size={14} /> Search</button>
        </form>
        {results === null && <p className="text-sm text-gray-500">Searching TMDB…</p>}
        {results?.length === 0 && <p className="text-sm text-gray-500">Nothing found. Try another spelling, no year, or paste the IMDb link.</p>}
        <div className="space-y-2">
          {results?.map((r) => (
            <button
              key={r.tmdbId}
              type="button"
              disabled={busy}
              onClick={() => void choose(r.tmdbId)}
              className={`flex w-full gap-3 rounded-xl border p-2 text-left hover:bg-gray-800 ${currentTmdbId === r.tmdbId ? 'border-blue-500' : 'border-gray-800'}`}
            >
              {r.poster ? <img src={r.poster} alt="" className="h-20 w-14 shrink-0 rounded object-cover" loading="lazy" /> : <div className="h-20 w-14 shrink-0 rounded bg-gray-800" />}
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-100">
                  {r.title} {r.year && <span className="font-normal text-gray-400">({r.year})</span>}
                  {currentTmdbId === r.tmdbId && <span className="ml-2 text-[11px] font-bold text-blue-400">Current</span>}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-gray-500">{r.overview}</p>
                <p className="mt-1 text-[11px] text-gray-600">TMDB {r.tmdbId}</p>
              </div>
            </button>
          ))}
        </div>
        {locked && (
          <button type="button" className={`${btn} mt-4`} disabled={busy} onClick={() => void choose(null)}>
            Forget my choice (match automatically)
          </button>
        )}
      </div>
    </div>
  );
};

/** "Fix match" for a portal title ("movie_123"): loads its current match, saves the choice. */
export const PortalFixMatch: React.FC<{ contentId: string; onClose: () => void; onChanged: () => void }> = ({ contentId, onClose, onChanged }) => {
  const [title, setTitle] = useState<PortalTitleMatch | null>(null);
  useEffect(() => {
    let cancelled = false;
    getPortalTitleMatch(contentId)
      .then((t) => { if (!cancelled) setTitle(t); })
      .catch((err) => { toast.error(errorText(err, 'Could not load the title')); onClose(); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId]);
  if (!title) return null;
  return (
    <FixMatchDialog
      name={title.name}
      year={title.year}
      kind={title.kind}
      subtitle={title.imdbId ? `${title.name} · now ${title.imdbId}` : title.name}
      currentTmdbId={title.tmdbId}
      locked={title.locked}
      onChoose={async (tmdbId) => {
        const r = await setPortalTitleMatch(contentId, tmdbId);
        onChanged();
        if (tmdbId) return 'Match saved. Reopen the title to see its new poster and description.';
        return r.tmdbId ? 'Matched automatically again' : 'Back to automatic matching (TMDB found nothing)';
      }}
      onClose={onClose}
    />
  );
};

export default FixMatchDialog;
