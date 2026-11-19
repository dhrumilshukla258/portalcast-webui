import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  FolderOpen, Folder, ChevronLeft, Plus, RefreshCw, Trash2, Pencil, X, Film, AlertTriangle, Check,
} from 'lucide-react';
import {
  getLibraries, createLibrary, updateLibrary, deleteLibrary, scanLibrary, browseFolders,
  getLibraryTitles, setTitleMatch,
} from '@/api/endpoints/admin';
import type { LibrariesResponse, LocalLibrary, FolderListing, LibraryTitle } from '@/api/types/admin';
import { formatAgo } from '@/hooks/useStreamFailures';
import FixMatchDialog from '@/components/organisms/admin/FixMatchDialog';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';

const errorText = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;

const btn =
  'flex items-center justify-center gap-1.5 rounded-lg border border-line-strong px-3 py-2 text-xs font-bold text-fg-soft hover:bg-panel-hover disabled:opacity-50';
const primaryBtn =
  'flex items-center justify-center gap-1.5 rounded-lg bg-action px-3 py-2 text-xs font-bold text-on-action hover:bg-action-hover disabled:opacity-50';

/** Folder picker limited to the server's media roots. */
const FolderBrowser: React.FC<{ onPick: (path: string) => void }> = ({ onPick }) => {
  const [listing, setListing] = useState<FolderListing | null>(null);
  const open = useCallback(async (path?: string) => {
    try {
      setListing(await browseFolders(path));
    } catch (err) {
      toast.error(errorText(err, 'Could not open that folder'));
    }
  }, []);
  useEffect(() => {
    void open();
  }, [open]);
  if (!listing) return <div className="py-4 text-sm text-fg-subtle">Loading folders…</div>;
  return (
    <div className="rounded-xl border border-line bg-page/50">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {listing.path && (
            <button type="button" className="rounded p-1 text-fg-muted hover:bg-panel-hover" onClick={() => void open(listing.parent ?? undefined)} aria-label="Up">
              <ChevronLeft size={16} />
            </button>
          )}
          <span className="truncate font-mono text-xs text-fg-muted">{listing.path ?? 'Media roots'}</span>
        </div>
        {listing.path && (
          <button type="button" className={primaryBtn} onClick={() => onPick(listing.path!)}>
            <Check size={14} /> Use this folder
          </button>
        )}
      </div>
      <div className="max-h-64 overflow-y-auto py-1">
        {listing.folders.length === 0 && <div className="px-3 py-3 text-xs text-fg-subtle">No folders here.</div>}
        {listing.folders.map((f) => (
          <button
            key={f.path}
            type="button"
            disabled={f.exists === false}
            onClick={() => void open(f.path)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg-soft hover:bg-panel-hover disabled:opacity-40"
          >
            <Folder size={15} className="shrink-0 text-accent" />
            <span className="truncate">{f.name}</span>
            {f.exists === false && <span className="ml-auto text-xs text-amber-400">not mounted</span>}
          </button>
        ))}
      </div>
    </div>
  );
};

const LibraryEditor: React.FC<{ lib?: LocalLibrary; onClose: () => void; onSaved: () => void }> = ({ lib, onClose, onSaved }) => {
  const [kind, setKind] = useState<'movies' | 'series'>(lib?.kind === 'series' ? 'series' : 'movies');
  const [name, setName] = useState(lib?.name ?? 'Movies');
  const [folders, setFolders] = useState<string[]>(lib?.folders ?? []);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      if (lib) await updateLibrary(lib.id, { name, folders });
      else await createLibrary(name, folders, kind);
      toast.success(lib ? 'Library saved' : 'Library added; the first scan has started');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorText(err, 'Could not save the library'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} labelledBy="library-editor-title" className="max-h-[90vh] max-w-2xl p-5" dismissOnBackdrop={false}>
      <div className="mb-4 flex items-center justify-between">
        <h2 id="library-editor-title" className="text-lg font-black text-fg">{lib ? 'Edit library' : 'Add a library'}</h2>
        <button type="button" onClick={onClose} className="rounded p-1 text-fg-muted hover:bg-panel-hover" aria-label="Close">
          <X size={18} />
        </button>
      </div>
      {!lib && (
        <div className="mb-4 flex gap-2">
          {(['movies', 'series'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setKind(k);
                if (name === 'Movies' || name === 'Series') setName(k === 'movies' ? 'Movies' : 'Series');
              }}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${kind === k ? 'bg-action text-on-action' : 'border border-line-strong text-fg-soft hover:bg-panel-hover'}`}
            >
              {k === 'movies' ? 'Movies' : 'Series'}
            </button>
          ))}
        </div>
      )}
      <label className="mb-1 block text-xs font-semibold text-fg-muted">Name</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mb-4 w-full rounded-lg border border-line-strong bg-page/60 px-3 py-2 text-sm text-fg outline-none focus:border-focus"
      />
      <label className="mb-1 block text-xs font-semibold text-fg-muted">Folders</label>
      <div className="mb-3 space-y-1">
        {folders.length === 0 && <p className="text-xs text-fg-subtle">No folder yet: pick one below.</p>}
        {folders.map((f) => (
          <div key={f} className="flex items-center justify-between gap-2 rounded-lg bg-page/60 px-3 py-2">
            <span className="truncate font-mono text-xs text-fg-soft">{f}</span>
            <button type="button" onClick={() => setFolders(folders.filter((x) => x !== f))} className="text-fg-subtle hover:text-red-400" aria-label="Remove folder">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <FolderBrowser onPick={(p) => !folders.includes(p) && setFolders([...folders, p])} />
      <p className="mt-2 text-xs text-fg-subtle">
        Folders named like Jellyfin's work as they are:{' '}
        <span className="font-mono">
          {kind === 'series' ? 'Show (2005)/Season 01/Show S01E02.mkv' : 'Movie (2010) [tmdbid-123]/Movie (2010) - 1080p.mkv'}
        </span>.
        Your files are only read, never changed.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="accent" disabled={busy || !name.trim() || folders.length === 0} onClick={() => void save()}>
          {lib ? 'Save' : 'Add and scan'}
        </Button>
      </div>
    </Dialog>
  );
};

const FixMatch: React.FC<{ title: LibraryTitle; onClose: () => void; onDone: () => void }> = ({ title, onClose, onDone }) => (
  <FixMatchDialog
    name={title.name}
    year={title.year}
    kind={title.kind}
    subtitle={title.folder}
    currentTmdbId={title.matchedTmdbId}
    locked={title.locked}
    onChoose={async (tmdbId) => {
      await setTitleMatch(title.id, tmdbId);
      onDone();
      return tmdbId ? 'Match saved' : 'Back to automatic matching';
    }}
    onClose={onClose}
  />
);

const Titles: React.FC<{ lib: LocalLibrary }> = ({ lib }) => {
  const [filter, setFilter] = useState<'unmatched' | 'all' | 'missing'>(lib.counts.unmatched ? 'unmatched' : 'all');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<LibraryTitle[] | null>(null);
  const [fixing, setFixing] = useState<LibraryTitle | null>(null);
  const load = useCallback(async () => {
    try {
      setItems(await getLibraryTitles(lib.id, filter, q));
    } catch {
      setItems([]);
    }
  }, [lib.id, filter, q]);
  useEffect(() => {
    const t = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(t);
  }, [load]);
  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(['unmatched', 'all', 'missing'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${filter === f ? 'bg-action text-on-action' : 'border border-line-strong text-fg-soft hover:bg-panel-hover'}`}
          >
            {f === 'unmatched' ? `Unmatched (${lib.counts.unmatched})` : f === 'missing' ? `Missing (${lib.counts.missing})` : `All (${lib.counts.titles})`}
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name or folder" className="ml-auto w-full rounded-lg border border-line-strong bg-page/60 px-3 py-1.5 text-sm text-fg outline-none focus:border-focus sm:w-64" />
      </div>
      {items === null && <p className="text-sm text-fg-subtle">Loading…</p>}
      {items?.length === 0 && <p className="text-sm text-fg-subtle">Nothing here.</p>}
      <div className="divide-y divide-divider/70">
        {items?.map((t) => (
          <div key={t.id} className="flex items-center gap-3 py-2">
            {t.poster ? <img src={t.poster} alt="" className="h-14 w-10 shrink-0 rounded object-cover" loading="lazy" /> : <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded bg-panel-raised"><Film size={14} className="text-fg-subtle" /></div>}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-fg">
                {t.matchedTitle || t.name} {(t.matchedYear || t.year) && <span className="font-normal text-fg-muted">({t.matchedYear || t.year})</span>}
                {t.locked && <span className="ml-2 rounded bg-accent/15 px-1.5 py-0.5 text-3xs font-bold text-accent">fixed</span>}
                {!t.matchedTmdbId && <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-3xs font-bold text-amber-300">unmatched</span>}
                {t.missingSince && <span className="ml-2 rounded bg-red-500/15 px-1.5 py-0.5 text-3xs font-bold text-red-300">missing</span>}
              </div>
              <div className="truncate font-mono text-2xs text-fg-subtle">{t.folder}</div>
            </div>
            <button type="button" className={btn} onClick={() => setFixing(t)}>Fix match</button>
          </div>
        ))}
      </div>
      {fixing && <FixMatch title={fixing} onClose={() => setFixing(null)} onDone={() => void load()} />}
    </div>
  );
};

/** Admin > Libraries: local movie folders on the NAS (server docs/skill-local-library.md). */
const LibrariesTab: React.FC = () => {
  const [data, setData] = useState<LibrariesResponse | null>(null);
  const [editing, setEditing] = useState<LocalLibrary | 'new' | null>(null);
  const [openTitles, setOpenTitles] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await getLibraries());
    } catch {
      toast.error('Could not load libraries (server update required?)');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  // While a scan runs, refresh every few seconds.
  useEffect(() => {
    if (!data?.scanning) return;
    const t = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(t);
  }, [data?.scanning, load]);

  const scan = async (id: number | 'all') => {
    try {
      const r = await scanLibrary(id);
      toast.info(r.started ? 'Scan started' : 'A scan is already running');
      void load();
    } catch (err) {
      toast.error(errorText(err, 'Could not start the scan'));
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-fg-muted">
          Your movies and series, shown as <span className="font-semibold text-fg-soft">My Library</span> in Movies and Series and
          alongside IPTV in Discover. Connect your Jellyfin server in <span className="font-semibold text-fg-soft">Settings › Jellyfin</span>:
          its libraries appear here and Jellyfin keeps doing the scanning and transcoding. Folder libraries (under the media roots,{' '}
          {data?.roots.join(', ') || '…'}) still work without Jellyfin.
        </p>
        <div className="flex gap-2">
          <button type="button" className={btn} disabled={data?.scanning} onClick={() => void scan('all')}>
            <RefreshCw size={14} className={data?.scanning ? 'animate-spin' : ''} /> {data?.scanning ? 'Scanning…' : 'Scan all'}
          </button>
          <button type="button" className={primaryBtn} onClick={() => setEditing('new')}>
            <Plus size={14} /> Add library
          </button>
        </div>
      </div>

      {data && data.items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line-strong p-8 text-center">
          <FolderOpen className="mx-auto mb-2 text-fg-subtle" />
          <p className="text-sm text-fg-muted">No library yet. Add one and pick your movie folder.</p>
        </div>
      )}

      {data?.items.map((lib) => (
        <section key={lib.id} className="rounded-xl bg-white/[0.03] px-5 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-black text-fg">
                {lib.name}
                <span className="ml-2 rounded bg-panel-raised px-1.5 py-0.5 text-3xs font-bold uppercase text-fg-muted">{lib.kind === 'series' ? 'Series' : 'Movies'}</span>
                {lib.source === 'jellyfin' && (
                  <span className="ml-2 rounded bg-purple-900/60 px-1.5 py-0.5 text-3xs font-bold uppercase text-purple-200">Jellyfin</span>
                )}
                {!lib.enabled && <span className="ml-2 text-xs font-semibold text-fg-subtle">(off)</span>}
              </h2>
              {lib.folders.map((f) => (
                <div key={f} className="truncate font-mono text-xs text-fg-subtle">{f}</div>
              ))}
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-fg-muted">
                <span>{lib.counts.titles} titles</span>
                <span>{lib.counts.files} files</span>
                {lib.counts.unmatched > 0 && <span className="text-amber-300">{lib.counts.unmatched} unmatched</span>}
                {lib.counts.missing > 0 && <span className="text-red-300">{lib.counts.missing} missing</span>}
                <span>{lib.lastScanAt ? `scanned ${formatAgo(lib.lastScanAt)}` : 'not scanned yet'}</span>
              </div>
              {lib.lastScanSummary?.includes('skipped') && (
                <p className="mt-1 flex items-center gap-1 text-xs text-amber-300">
                  <AlertTriangle size={12} />
                  {lib.source === 'jellyfin'
                    ? ' Jellyfin was not reachable on the last sync; its titles were left as they were.'
                    : ' A folder was not reachable on the last scan; its titles were left as they were.'}
                </p>
              )}
              {lib.source !== 'jellyfin' && lib.lastScanSummary?.includes('Jellyfin is connected') && (
                <p className="mt-1 text-xs text-fg-muted">
                  Not scanned while Jellyfin is connected: Jellyfin takes over these files (watch history and lists stay). Remove this library once
                  everything shows from Jellyfin.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btn} disabled={data.scanning} onClick={() => void scan(lib.id)}>
                <RefreshCw size={14} /> Scan
              </button>
              <button type="button" className={btn} onClick={() => setOpenTitles(openTitles === lib.id ? null : lib.id)}>
                <Film size={14} /> Titles
              </button>
              {lib.source !== 'jellyfin' && (
                <button type="button" className={btn} onClick={() => setEditing(lib)}>
                  <Pencil size={14} /> Edit
                </button>
              )}
              <button
                type="button"
                className={btn}
                onClick={async () => {
                  try {
                    await updateLibrary(lib.id, { enabled: !lib.enabled });
                    void load();
                  } catch (err) {
                    toast.error(errorText(err, 'Could not change the library'));
                  }
                }}
              >
                {lib.enabled ? 'Turn off' : 'Turn on'}
              </button>
              <button
                type="button"
                className={`${btn} text-red-400`}
                onClick={async () => {
                  const fromJellyfin = lib.source === 'jellyfin';
                  const question = fromJellyfin
                    ? `Empty "${lib.name}" and switch it off? Nothing changes in Jellyfin; turn it on to read it again. Watch history is kept.`
                    : `Remove "${lib.name}" from PortalCast? Your files stay where they are; watch history is kept.`;
                  if (!window.confirm(question)) return;
                  try {
                    await deleteLibrary(lib.id);
                    toast.success(fromJellyfin ? 'Library emptied and switched off' : 'Library removed');
                    void load();
                  } catch (err) {
                    toast.error(errorText(err, 'Could not remove the library'));
                  }
                }}
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
          </div>
          {openTitles === lib.id && <Titles lib={lib} />}
        </section>
      ))}

      {editing && (
        <LibraryEditor lib={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSaved={() => void load()} />
      )}
    </div>
  );
};

export default LibrariesTab;
