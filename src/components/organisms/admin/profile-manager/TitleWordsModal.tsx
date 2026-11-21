import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { RotateCcw, Save, X } from 'lucide-react';
import { getTitleWords, saveTitleWords } from '@/api/endpoints/admin';
import type { TitleWords, TitleWordEdits } from '@/api/endpoints/admin';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';

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
        ? 'border-line-strong bg-panel/40 text-fg-subtle line-through'
        : mine
          ? 'border-accent/40 bg-accent/15 text-accent hover:bg-accent/25'
          : 'border-divider/60 bg-panel-raised/60 text-fg-soft hover:bg-panel-hover/70'
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
    <Dialog open onClose={onClose} labelledBy="title-words-title" className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0 text-left" dismissOnBackdrop={false}>
      <div className="flex items-start justify-between gap-4 border-b border-divider/50 p-5">
        <div className="min-w-0">
          <h2 id="title-words-title" className="text-lg font-bold text-fg">Title words</h2>
          <p className="truncate text-sm text-fg-muted">
            {profileName} · {changes ? `${changes} change${changes === 1 ? '' : 's'} from the defaults` : 'the defaults'}
          </p>
        </div>
        <button type="button" onClick={onClose} data-focusable="true" aria-label="Close" className="rounded-lg p-1.5 text-fg-muted hover:bg-panel-hover hover:text-fg">
          <X className="h-5 w-5" />
        </button>
      </div>

      {!data ? (
        <div className="p-8 text-center text-fg-muted">Loading…</div>
      ) : (
        <>
          <div className="flex gap-1 border-b border-divider/50 px-5 pt-3">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setSection(t.id); setWord(''); setFilter(''); }}
                data-focusable="true"
                className={`rounded-t-lg px-3 py-2 text-sm font-semibold ${section === t.id ? 'bg-panel-raised text-fg' : 'text-fg-muted hover:text-fg-soft'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <p className="text-sm text-fg-muted">{tabs.find((t) => t.id === section)!.hint} Click a word to turn it off for this portal.</p>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={word}
                onChange={(e) => setWord(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
                placeholder={section === 'languages' ? 'Spelling, e.g. hin dub' : section === 'tags' ? 'Tag, e.g. HEVC' : 'Channel name, e.g. Geo Kahani'}
                data-focusable="true"
                className="min-w-0 flex-1 rounded-lg border border-divider/50 bg-panel-raised/50 p-2 text-sm text-fg placeholder-fg-subtle focus:border-focus focus:outline-hidden focus:ring-1 focus:ring-focus"
              />
              {section === 'languages' && (
                <>
                  <input
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    list="title-words-languages"
                    placeholder="Language"
                    data-focusable="true"
                    className="rounded-lg border border-divider/50 bg-panel-raised/50 p-2 text-sm text-fg placeholder-fg-subtle focus:border-focus focus:outline-hidden focus:ring-1 focus:ring-focus sm:w-40"
                  />
                  <datalist id="title-words-languages">
                    {data.defaults.languages.map((l) => <option key={l.language} value={l.language} />)}
                  </datalist>
                </>
              )}
              <button type="button" onClick={add} data-focusable="true" className="rounded-lg bg-action px-4 py-2 text-sm font-bold text-on-action hover:bg-action-hover active:scale-95">
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
                      <span className="w-24 shrink-0 text-xs font-semibold text-fg-soft">{lang}</span>
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
                    className="w-full rounded-lg border border-divider/50 bg-panel/50 p-2 text-sm text-fg placeholder-fg-subtle focus:border-focus focus:outline-hidden"
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

          <div className="flex flex-col-reverse gap-2 border-t border-divider/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="secondary" onClick={() => setEdits(EMPTY)} disabled={!changes}>
              <RotateCcw className="h-4 w-4" /> Reset to defaults
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose} className="flex-1 sm:flex-none">
                Close
              </Button>
              <Button variant="accent" onClick={save} disabled={!dirty || saving} className="flex-1 sm:flex-none">
                <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </>
      )}
    </Dialog>
  );
};

export default TitleWordsModal;
