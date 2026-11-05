import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { X, Search, Undo2, HardDrive } from 'lucide-react';
import { getTitleMerges, searchMergeTitles, mergeTitle, undoTitleMerge } from '@/api/endpoints/admin';
import type { TitleMerges, MergeCandidate } from '@/api/types/admin';

const errorText = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;

const btn =
  'flex items-center justify-center gap-1.5 rounded-lg border border-gray-700 px-3 py-2 text-xs font-bold text-gray-200 hover:bg-gray-800 disabled:opacity-50';

/**
 * "Merge with…" on a title's page (admins): two or three entries that are one film or show but
 * do not show as versions of each other (owner 2026-11-05: the NAS's "Dune: Part One" beside the
 * provider's "Dune"). Every copy of this title joins the one picked, and new copies follow. Each
 * merge can be undone here.
 */
const MergeTitleDialog: React.FC<{ contentId: string; onClose: () => void; onChanged: () => void }> = ({ contentId, onClose, onChanged }) => {
  const [info, setInfo] = useState<TitleMerges | null>(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<MergeCandidate[] | null>(null);
  const [pick, setPick] = useState<MergeCandidate | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const t = await getTitleMerges(contentId);
      setInfo(t);
      return t;
    } catch (err) {
      toast.error(errorText(err, 'Could not load the title'));
      onClose();
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId]);

  const search = useCallback(async (type: 'movie' | 'series', text: string) => {
    setResults(null);
    try {
      setResults(await searchMergeTitles(type, text));
    } catch (err) {
      toast.error(errorText(err, 'Search failed'));
      setResults([]);
    }
  }, []);

  useEffect(() => {
    void load().then((t) => {
      if (!t) return;
      // Start from the first words of the name: "Dune: Part One" finds "Dune".
      const start = t.name.split(/[:\-–(]/)[0].trim() || t.name;
      setQ(start);
      void search(t.type, start);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId]);

  const run = async (what: () => Promise<string>) => {
    setBusy(true);
    try {
      toast.success(await what());
      onChanged();
      await load();
      setPick(null);
    } catch (err) {
      toast.error(errorText(err, 'That did not work'));
    } finally {
      setBusy(false);
    }
  };

  if (!info) return null;
  const others = (results ?? []).filter((r) => r.id !== contentId);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Merge with…</h2>
          <button type="button" data-focusable="true" onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-800" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-xs text-gray-400">
          "{info.name}" and the title you pick are one {info.type === 'movie' ? 'film' : 'show'}: its copies become versions of that title. Undo it here any time.
        </p>

        {info.mergedInto && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-gray-800 p-3 text-sm text-gray-200">
            <span className="min-w-0">Merged into <b>{info.mergedInto.toName}</b></span>
            <button type="button" data-focusable="true" className={btn} disabled={busy}
              onClick={() => void run(async () => { await undoTitleMerge(info.mergedInto!.from); return 'Merge undone'; })}>
              <Undo2 size={14} /> Undo
            </button>
          </div>
        )}
        {info.mergedHere.length > 0 && (
          <div className="mb-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Merged into this title</p>
            {info.mergedHere.map((m) => (
              <div key={m.from} className="flex items-center justify-between gap-3 rounded-xl border border-gray-800 p-3 text-sm text-gray-200">
                <span className="min-w-0 truncate">{m.fromName}</span>
                <button type="button" data-focusable="true" className={btn} disabled={busy}
                  onClick={() => void run(async () => { await undoTitleMerge(m.from); return `"${m.fromName}" is its own title again`; })}>
                  <Undo2 size={14} /> Undo
                </button>
              </div>
            ))}
          </div>
        )}

        <form className="mb-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); void search(info.type, q); }}>
          <input
            value={q}
            data-focusable="true"
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Find the other ${info.type === 'movie' ? 'film' : 'show'}`}
            className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-950/60 px-3 py-2 text-sm text-gray-100 outline-none focus:border-blue-500"
          />
          <button type="submit" data-focusable="true" className={btn}><Search size={14} /> Search</button>
        </form>
        {results === null && <p className="text-sm text-gray-500">Searching…</p>}
        {results !== null && others.length === 0 && <p className="text-sm text-gray-500">Nothing found. Try fewer words.</p>}
        <div className="space-y-2">
          {others.map((r) => (
            <button
              key={r.id}
              type="button"
              data-focusable="true"
              disabled={busy}
              onClick={() => setPick(r)}
              className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left hover:bg-gray-800 ${pick?.id === r.id ? 'border-blue-500' : 'border-gray-800'}`}
            >
              {r.poster ? <img src={r.poster} alt="" className="h-16 w-11 shrink-0 rounded object-cover" loading="lazy" /> : <div className="h-16 w-11 shrink-0 rounded bg-gray-800" />}
              <div className="min-w-0 text-sm text-gray-100">
                <div className="truncate font-semibold">{r.name} {r.year && <span className="font-normal text-gray-400">({r.year})</span>}</div>
                {r.local && <div className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400"><HardDrive size={11} /> My library</div>}
              </div>
            </button>
          ))}
        </div>

        {pick && (
          <div className="mt-4 rounded-xl border border-blue-900/60 bg-blue-950/30 p-3 text-sm text-gray-200">
            <p className="mb-3">Merge "{info.name}" into "{pick.name}"{pick.year ? ` (${pick.year})` : ''}? Its copies become versions of "{pick.name}".</p>
            <div className="flex gap-2">
              <button type="button" data-focusable="true" className={`${btn} border-blue-600 bg-blue-600 text-white hover:bg-blue-500`} disabled={busy}
                onClick={() => void run(async () => { const r = await mergeTitle(contentId, pick.id); return `Merged: ${r.moved} ${r.moved === 1 ? 'copy is' : 'copies are'} now versions of "${pick.name}"`; })}>
                Merge
              </button>
              <button type="button" data-focusable="true" className={btn} disabled={busy} onClick={() => setPick(null)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MergeTitleDialog;
