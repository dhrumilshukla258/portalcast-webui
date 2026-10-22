import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import { getSportsLeagues, type SportsLeagues } from '@/api/endpoints/sports';
import { updateUserPreferences } from '@/api/endpoints/auth';

/**
 * "Choose sports": every league the schedule source has, by sport, with the viewer's choice
 * ticked (at most `max`). Saved in the viewer's preferences, so every device shows the same.
 * Full screen (over everything, a portal on <body>), the phone's Back or Escape closes it.
 */
const ChooseSports: React.FC<{ onClose: (saved: boolean) => void }> = ({ onClose }) => {
  const [data, setData] = useState<SportsLeagues | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Closing always goes through Back (our history entry); this says whether it was a Save.
  const saved = useRef(false);

  useEffect(() => {
    getSportsLeagues().then((d) => { setData(d); setChosen(d.chosen); }).catch(() => setError("Couldn't load the list."));
  }, []);

  // Back / Escape close it (one history entry, consumed here).
  useEffect(() => {
    window.history.pushState({ ...(window.history.state ?? {}), chooseSports: 1 }, '');
    let open = true;
    const onPop = (e: PopStateEvent) => {
      if (!open || e.state?.chooseSports) return;
      e.stopImmediatePropagation();
      open = false;
      onClose(saved.current);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') window.history.back(); };
    window.addEventListener('popstate', onPop, true);
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('popstate', onPop, true);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bySport = useMemo(() => {
    const m = new Map<string, SportsLeagues['leagues']>();
    for (const l of data?.leagues ?? []) {
      const list = m.get(l.sport);
      if (list) list.push(l);
      else m.set(l.sport, [l]);
    }
    return [...m.entries()];
  }, [data]);
  const max = data?.max ?? 20;

  const toggle = (id: string) =>
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= max ? c : [...c, id]));

  const save = async () => {
    setSaving(true);
    try {
      await updateUserPreferences({ sportsLeagues: chosen });
      saved.current = true;
      window.history.back();
    } catch {
      setError("Couldn't save. Try again.");
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#05080F]" role="dialog" aria-modal="true" data-focus-group="choose-sports">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 px-2 pt-[env(safe-area-inset-top)] sm:px-6">
        <button data-focusable="true" onClick={() => window.history.back()} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10">
          <X className="h-6 w-6" />
        </button>
        <h2 className="flex-1 truncate text-lg font-bold text-white">Choose sports</h2>
        <span className="text-sm text-gray-400">{chosen.length} / {max}</span>
      </div>
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-6">
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        {!data && !error && <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-sky-400" /></div>}
        {bySport.map(([sport, leagues]) => (
          <section key={sport} className="mb-5">
            <h3 className="mb-2 text-base font-bold text-white">{sport}</h3>
            <div className="flex flex-wrap gap-2">
              {leagues.map((l) => {
                const on = chosen.includes(l.id);
                return (
                  <button
                    key={l.id}
                    data-focusable="true"
                    onClick={() => toggle(l.id)}
                    className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors ${
                      on ? 'bg-sky-400 text-[#082F49]' : 'border border-white/15 text-gray-200 hover:border-white/30'
                    }`}
                  >
                    {on && <Check className="h-4 w-4" />}
                    {l.name}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <div className="shrink-0 border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
        <button
          data-focusable="true"
          onClick={() => void save()}
          disabled={saving || !data || chosen.length === 0}
          className="h-12 w-full rounded-xl bg-white text-base font-bold text-[#0A0F1C] disabled:opacity-50"
        >
          {saving ? 'Saving…' : chosen.length === 0 ? 'Pick at least one' : `Show ${chosen.length} ${chosen.length === 1 ? 'league' : 'leagues'}`}
        </button>
      </div>
    </div>,
    document.body
  );
};

export default ChooseSports;
