import React, { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck, Check, EyeOff, Info, Trash2, X } from 'lucide-react';
import type { MediaItem } from '@/types';
import type { TitleMenuExtra } from '@/context/TitleMenuContext';
import { contentIdOf } from '@/utils/contentId';
import { getMyListIds, setInMyList } from '@/api/endpoints/discover';
import { setNotInterested, setWatched } from '@/api/endpoints/user';
import { markHidden, useHiddenTitles } from '@/utils/hiddenTitles';
import Dialog from '@/components/ui/Dialog';

interface TitleMenuProps {
  item: MediaItem;
  extra?: TitleMenuExtra;
  onClose: () => void;
  /** Something changed (watched, hidden, list): App refreshes Home and Continue Watching. */
  onChanged: () => void;
}

/**
 * The title menu (owner, 2026-10-22: hold a title on the TV and the phone, click on a PC):
 * My List, Mark as watched, Not interested (off your Home rows: new things instead of the
 * same ones) and, on Continue Watching, Remove. A sheet from the bottom on a phone, a small
 * panel in the middle on wider screens (Dialog). Escape or a tap outside closes it.
 */
const TitleMenu: React.FC<TitleMenuProps> = ({ item, extra, onClose, onChanged }) => {
  const id = contentIdOf(item);
  const hidden = useHiddenTitles();
  const [inList, setInList] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const title = String((item as unknown as { cw_show_title?: string }).cw_show_title || item.title || item.name || '');

  useEffect(() => {
    if (!id) return;
    getMyListIds().then((ids) => setInList(ids ? ids.has(id) : null)).catch(() => {});
  }, [id]);

  const run = async (label: string, action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
      onChanged();
      setDone(label);
      setTimeout(onClose, 700);
    } catch {
      setDone("Couldn't do that. Try again.");
      setBusy(false);
    }
  };

  const Row: React.FC<{ icon: React.ReactNode; label: string; note?: string; onClick: () => void }> = ({ icon, label, note, onClick }) => (
    <button
      data-focusable="true"
      disabled={busy}
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-xl px-4 py-3.5 text-left hover:bg-interaction focus:bg-interaction focus:outline-hidden disabled:opacity-50 [&.focused]:bg-interaction"
    >
      <span className="text-fg-soft">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-fg">{label}</span>
        {note && <span className="block truncate text-xs text-fg-subtle">{note}</span>}
      </span>
    </button>
  );

  return (
    <Dialog
      open
      onClose={onClose}
      labelledBy="title-menu-title"
      focusGroup="title-menu"
      className="max-w-md self-end p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:self-center"
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <h3 id="title-menu-title" className="min-w-0 flex-1 truncate text-base font-bold text-fg">{title}</h3>
        <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-fg-soft hover:bg-interaction">
          <X className="h-5 w-5" />
        </button>
      </div>
      {done ? (
        <p className="flex items-center gap-2 px-4 py-6 text-sm font-semibold text-accent"><Check className="h-4 w-4" /> {done}</p>
      ) : !id ? (
        <p className="px-4 py-6 text-sm text-fg-muted">Nothing to do for this one.</p>
      ) : (
        <div className="pb-1">
          {extra?.onDetails && (
            <Row
              icon={<Info className="h-5 w-5" />}
              label="Details"
              note="Its page: episodes, cast, more like this"
              onClick={() => {
                onClose();
                extra.onDetails!();
              }}
            />
          )}
          {inList !== null && (
            <Row
              icon={inList ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
              label={inList ? 'Remove from My List' : 'Add to My List'}
              onClick={() => void run(inList ? 'Removed from My List' : 'Added to My List', () => setInMyList(id, !inList))}
            />
          )}
          <Row
            icon={<Check className="h-5 w-5" />}
            label="Mark as watched"
            note="Leaves Continue Watching and your suggestions"
            onClick={() => void run('Marked as watched', () => setWatched(id, true))}
          />
          {hidden.has(id) ? (
            <Row
              icon={<EyeOff className="h-5 w-5" />}
              label="Show on Home again"
              note="You said Not interested"
              onClick={() => void run('It can show on Home again', async () => { await setNotInterested(id, false); markHidden(id, false); })}
            />
          ) : (
            <Row
              icon={<EyeOff className="h-5 w-5" />}
              label="Not interested"
              note="Keeps it off your Home rows (undo in My List)"
              onClick={() => void run("Got it: you won't see it on Home", async () => { await setNotInterested(id, true); markHidden(id, true); })}
            />
          )}
          {extra?.onRemoveFromContinue && (
            <Row
              icon={<Trash2 className="h-5 w-5" />}
              label="Remove from Continue Watching"
              note="Your place in it is forgotten"
              onClick={() => void run('Removed from Continue Watching', async () => { extra.onRemoveFromContinue!(); })}
            />
          )}
        </div>
      )}
    </Dialog>
  );
};

export default TitleMenu;
