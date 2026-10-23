import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { RotateCcw, Save, X } from 'lucide-react';
import { getTitleWords, saveTitleWords } from '@/api/endpoints/admin';
import type { TitleWords, TitleWordEdits } from '@/api/endpoints/admin';

// A portal profile's title words: the default lists the server uses to clean titles
// (languages and their spellings, quality and other tags, channel names in front of a title)
// and this portal's changes. Click a default to turn it off for this portal, add your own,
// Save: the server re-cleans this portal's titles in the background.

const EMPTY: TitleWordEdits = {
  languages: { add: [], remove: [] },
  tags: { add: [], remove: [] },
  channels: { add: [], remove: [] },
};
const errorOf = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;
const norm = (s: string) => s.trim().replace(/\s+/g, ' ');
const toggle = (list: string[], w: string) => (list.includes(w) ? list.filter((x) => x !== w) : [...list, w]);

type Section = 'languages' | 'tags' | 'channels';

const Chip: React.FC<{ label: string; off?: boolean; mine?: boolean; title?: string; onClick: () => void }> = ({ label, off, mine, title, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    data-focusable="true"
    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
      off
        ? 'border-gray-700 bg-gray-900/40 text-gray-500 line-through'
        : mine
          ? 'border-blue-500/40 bg-blue-500/15 text-blue-200 hover:bg-blue-500/25'
          : 'border-gray-600/60 bg-gray-800/60 text-gray-200 hover:bg-gray-700/70'
    }`}
  >
    {label}
    {mine && <X className="h-3 w-3" aria-hidden />}
  </button>
);

const TitleWordsModal: React.FC<{ profileId: number; profileName: string; onClose: () => void }> = ({ profileId, profileName, onClose }) => {
  const [data, setData] = useState<TitleWords | null>(null);
  const [edits, setEdits] = useState<TitleWordEdits>(EMPTY);
  const [section, setSection] = useState<Section>('languages');
  const [word, setWord] = useState('');
  const [language, setLanguage] = useState('Hindi');
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    getTitleWords(profileId)
      .then((d) => { if (alive) { setData(d); setEdits(d.edits); } })
      .catch((err) => { toast.error(errorOf(err, 'Could not load the title words')); onClose(); });
    return () => { alive = false; };
  }, [profileId, onClose]);

  const changes = useMemo(
    () => edits.languages.add.length + edits.languages.remove.length + edits.tags.add.length + edits.tags.remove.length + edits.channels.add.length + edits.channels.remove.length,
    [edits],
  );
  const dirty = useMemo(() => JSON.stringify(edits) !== JSON.stringify(data?.edits ?? EMPTY), [edits, data]);

  const add = () => {
    const w = norm(word);
    if (!w) return;
    if (w.length > 60) { toast.error('At most 60 characters'); return; }
    const lower = w.toLowerCase();
    setEdits((e) => {
      if (section === 'languages') {
        const lang = norm(language) || 'Hindi';
        return { ...e, languages: { remove: e.languages.remove.filter((x) => x !== lower), add: [...e.languages.add.filter((a) => a.spelling !== lower), { spelling: lower, language: lang }] } };
      }
      const list = e[section];
      // A default that was turned off comes back on; anything else is added once.
      const isDefault = section === 'tags' ? data?.defaults.tags.includes(lower) : data?.defaults.channels.includes(lower);
      if (isDefault) return { ...e, [section]: { ...list, remove: list.remove.filter((x) => x !== lower) } };
      if (list.add.some((x) => x.toLowerCase() === lower)) return e;
      return { ...e, [section]: { ...list, add: [...list.add, section === 'channels' ? w : lower] } };
    });
    setWord('');
  };

  const save = async () => {
    setSaving(true);
    try {
      const d = await saveTitleWords(profileId, edits);
      setData(d);
      setEdits(d.edits);
      toast.success(d.active ? 'Saved. This portal’s titles are being cleaned again in the background.' : 'Saved. Applied when this profile is active.');
    } catch (err) {
      toast.error(errorOf(err, 'Could not save the title words'));
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: Section; label: string; hint: string }[] = [
    { id: 'languages', label: 'Languages', hint: 'Spellings of a language in titles ("Hin", "Eng Dub"). They are taken off the title and name the version’s audio.' },
    { id: 'tags', label: 'Tags', hint: 'Quality and other words taken off the end of a title ("HD", "4K", "Web Series").' },
    { id: 'channels', label: 'Channel names', hint: 'TV channel names in front of a series title ("Hum TV : …", "Star Plus …"), taken off and shown as its channel.' },
  ];
  const q = filter.trim().toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-gray-700/50 bg-gray-900/90 text-left shadow-2xl backdrop-blur-md">
        <div className="flex items-start justify-between gap-4 border-b border-gray-700/50 p-5">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white">Title words</h2>
            <p className="truncate text-sm text-gray-400">
              {profileName} · {changes ? `${changes} change${changes === 1 ? '' : 's'} from the defaults` : 'the defaults'}
            </p>
          </div>
          <button type="button" onClick={onClose} data-focusable="true" aria-label="Close" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!data ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : (
          <>
            <div className="flex gap-1 border-b border-gray-700/50 px-5 pt-3">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setSection(t.id); setWord(''); setFilter(''); }}
                  data-focusable="true"
                  className={`rounded-t-lg px-3 py-2 text-sm font-semibold ${section === t.id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <p className="text-sm text-gray-400">{tabs.find((t) => t.id === section)!.hint} Click a word to turn it off for this portal.</p>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
                  placeholder={section === 'languages' ? 'Spelling, e.g. hin dub' : section === 'tags' ? 'Tag, e.g. HEVC' : 'Channel name, e.g. Geo Kahani'}
                  data-focusable="true"
                  className="min-w-0 flex-1 rounded-lg border border-gray-600/50 bg-gray-800/50 p-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
                {section === 'languages' && (
                  <>
                    <input
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      list="title-words-languages"
                      placeholder="Language"
                      data-focusable="true"
                      className="rounded-lg border border-gray-600/50 bg-gray-800/50 p-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500 sm:w-40"
                    />
                    <datalist id="title-words-languages">
                      {data.defaults.languages.map((l) => <option key={l.language} value={l.language} />)}
                    </datalist>
                  </>
                )}
                <button type="button" onClick={add} data-focusable="true" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500 active:scale-95">
                  Add
                </button>
              </div>

              {section === 'languages' && (
                <div className="space-y-3">
                  {[...new Set([...data.defaults.languages.map((l) => l.language), ...edits.languages.add.map((a) => a.language)])].map((lang) => {
                    const defaults = data.defaults.languages.find((l) => l.language === lang)?.spellings ?? [];
                    const mine = edits.languages.add.filter((a) => a.language === lang);
                    return (
                      <div key={lang} className="flex flex-wrap items-center gap-1.5">
                        <span className="w-24 shrink-0 text-xs font-semibold text-gray-300">{lang}</span>
                        {defaults.filter((s) => !mine.some((m) => m.spelling === s)).map((s) => (
                          <Chip key={s} label={s} off={edits.languages.remove.includes(s) || edits.languages.add.some((a) => a.spelling === s)}
                            title={edits.languages.add.some((a) => a.spelling === s) ? 'Given another language below' : undefined}
                            onClick={() => setEdits((e) => ({ ...e, languages: { ...e.languages, remove: toggle(e.languages.remove, s) } }))} />
                        ))}
                        {mine.map((a) => (
                          <Chip key={a.spelling} label={a.spelling} mine onClick={() => setEdits((e) => ({ ...e, languages: { ...e.languages, add: e.languages.add.filter((x) => x.spelling !== a.spelling) } }))} />
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}

              {section !== 'languages' && (
                <>
                  {section === 'channels' && (
                    <input
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      placeholder={`Search ${data.defaults.channels.length} channel names`}
                      data-focusable="true"
                      className="w-full rounded-lg border border-gray-700/50 bg-gray-900/50 p-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-hidden"
                    />
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {edits[section].add.filter((w) => !q || w.toLowerCase().includes(q)).map((w) => (
                      <Chip key={`mine-${w}`} label={w} mine onClick={() => setEdits((e) => ({ ...e, [section]: { ...e[section], add: e[section].add.filter((x) => x !== w) } }))} />
                    ))}
                    {data.defaults[section].filter((w) => !q || w.includes(q)).map((w) => (
                      <Chip key={w} label={w} off={edits[section].remove.includes(w)} onClick={() => setEdits((e) => ({ ...e, [section]: { ...e[section], remove: toggle(e[section].remove, w) } }))} />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-700/50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setEdits(EMPTY)}
                disabled={!changes}
                data-focusable="true"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-600/40 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-40"
              >
                <RotateCcw className="h-4 w-4" /> Reset to defaults
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={onClose} data-focusable="true" className="flex-1 rounded-lg px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 sm:flex-none">
                  Close
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={!dirty || saving}
                  data-focusable="true"
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-40 sm:flex-none"
                >
                  <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TitleWordsModal;
