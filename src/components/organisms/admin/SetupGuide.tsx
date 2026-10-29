import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Check, ChevronRight, X } from 'lucide-react';
import { getSetupGuide, setSetupGuideDismissed, saveSetting, testJellyfin, type SetupGuide as Guide } from '@/api/endpoints/admin';
import type { AdminTarget } from '@/components/organisms/admin/AdminOverview';

const errorText = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;

const field = 'w-full rounded-lg border border-gray-700 bg-gray-950/60 px-3 py-2 text-sm text-gray-100 outline-none focus:border-blue-500';
const btn = 'rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-bold text-gray-200 hover:bg-gray-800 disabled:opacity-50';
const primary = 'rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50';

interface StepProps {
  done: boolean;
  optional?: boolean;
  title: string;
  children: React.ReactNode;
}

const Step: React.FC<StepProps> = ({ done, optional, title, children }) => (
  <li className="flex gap-3 border-t border-white/5 py-4 first:border-t-0">
    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-gray-400'}`}>
      {done ? <Check size={14} /> : '•'}
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-white">
        {title}
        {optional && <span className="ml-2 text-xs font-normal text-gray-500">optional</span>}
      </p>
      <div className="mt-1 space-y-2 text-sm text-gray-400">{children}</div>
    </div>
  </li>
);

/**
 * The setup guide at the top of Admin › Overview (owner 2026-10-29): after the admin account,
 * everything a new server wants, each ticked when done, with the way to do it. Shown until
 * finished or dismissed; "Setup guide" brings it back.
 */
const SetupGuide: React.FC<{ onOpen: (t: AdminTarget) => void }> = ({ onOpen }) => {
  const [guide, setGuide] = useState<Guide | null>(null);
  const [open, setOpen] = useState(false);
  const [tmdb, setTmdb] = useState('');
  const [jfUrl, setJfUrl] = useState('');
  const [jfKey, setJfKey] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const g = await getSetupGuide();
    setGuide(g);
    if (g) setOpen(!g.dismissed);
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (!guide) return null;
  const s = guide.steps;
  const needed = [s.provider, s.tmdb].filter((d) => !d).length;

  if (!open) {
    return (
      <button type="button" className="text-xs font-semibold text-gray-500 hover:text-white" onClick={() => setOpen(true)}>
        Setup guide{needed ? ` · ${needed} to do` : ''}
      </button>
    );
  }

  const dismiss = async () => {
    setOpen(false);
    try { await setSetupGuideDismissed(true); } catch { /* shows again next time */ }
  };

  const saveTmdb = async () => {
    setBusy(true);
    try {
      await saveSetting('tmdbToken', tmdb.trim());
      setTmdb('');
      toast.success('TMDB token saved: artwork and details fill in over the next minutes');
      await load();
    } catch (err) {
      toast.error(errorText(err, 'Could not save the token'));
    } finally {
      setBusy(false);
    }
  };

  const saveJellyfin = async () => {
    setBusy(true);
    try {
      await saveSetting('jellyfinUrl', jfUrl.trim());
      await saveSetting('jellyfinApiKey', jfKey.trim());
      const r = await testJellyfin();
      if (r.ok) {
        toast.success(`Connected to ${r.server}. Its libraries fill My Library in a moment.`);
        setJfKey('');
      } else {
        toast.error(r.error || 'Could not reach Jellyfin');
      }
      await load();
    } catch (err) {
      toast.error(errorText(err, 'Could not save Jellyfin'));
    } finally {
      setBusy(false);
    }
  };

  const go = (section: string, page: string) => (
    <button type="button" className={`${btn} inline-flex items-center gap-1`} onClick={() => onOpen({ section, page })}>
      Open <ChevronRight size={12} />
    </button>
  );

  return (
    <section className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-white">Set up your server</h2>
          <p className="mt-1 text-sm text-gray-400">A few steps and everyone in the house can watch. Skip anything you don't need; it is all in Admin later.</p>
        </div>
        <button type="button" onClick={() => void dismiss()} className="rounded p-1 text-gray-500 hover:bg-white/5 hover:text-white" aria-label="Hide the setup guide">
          <X size={16} />
        </button>
      </div>
      <ol className="mt-3">
        <Step done title="Admin account">You are signed in as the admin.</Step>
        <Step done={s.provider} title="Your IPTV provider">
          <p>Add the subscription you have: a Stalker portal, Xtream Codes, or an M3U playlist link (with its XMLTV guide, if it has one).</p>
          {!s.provider && go('iptv', 'profiles')}
        </Step>
        <Step done={s.tmdb} title="Artwork and details (TMDB)">
          <p>A free TMDB "API Read Access Token" (themoviedb.org › Settings › API) gives posters, backdrops, cast and the clean one-card-per-title catalog.</p>
          {!s.tmdb && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input className={field} value={tmdb} onChange={(e) => setTmdb(e.target.value)} placeholder="TMDB API Read Access Token" />
              <button type="button" className={primary} disabled={busy || tmdb.trim().length < 20} onClick={() => void saveTmdb()}>Save</button>
            </div>
          )}
        </Step>
        <Step done={s.jellyfin} optional title="Your own films and shows (Jellyfin)">
          <p>Have Jellyfin? Connect it and its libraries join My Library, merged with your IPTV titles. Jellyfin keeps doing the scanning and transcoding.</p>
          {!s.jellyfin && (
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input className={field} value={jfUrl} onChange={(e) => setJfUrl(e.target.value)} placeholder="http://192.168.1.10:8096" />
              <input className={field} value={jfKey} onChange={(e) => setJfKey(e.target.value)} placeholder="API key (Jellyfin Dashboard › API Keys)" />
              <button type="button" className={primary} disabled={busy || !jfUrl.trim() || !jfKey.trim()} onClick={() => void saveJellyfin()}>Connect</button>
            </div>
          )}
          {s.jellyfin && !s.jellyfinSignIn && <p>Jellyfin is connected. To let people sign in with their Jellyfin accounts, turn on "Sign in with Jellyfin" in Settings › Jellyfin.</p>}
        </Step>
        <Step done={s.subtitles} optional title="Subtitles">
          <p>
            {s.subtitles
              ? 'Online subtitle search works. People can link their own OpenSubtitles account in their settings for more downloads.'
              : 'TV episodes are searched on Gestdown for free. For films, add an OpenSubtitles API key in Settings › Metadata services.'}
          </p>
        </Step>
        <Step done={s.users} optional title="The people who watch">
          <p>Each person gets their own Home, list and progress. Create accounts in People, or let them sign up (you approve them){s.jellyfin ? ', or sign in with Jellyfin' : ''}.</p>
          {go('people', 'users')}
        </Step>
        <Step done={false} optional title="The apps">
          <p>
            Phones and computers: open this server's address in the browser and choose "Install" or "Add to Home Screen". Android TV and Google TV:
            install the PortalCast app and enter the code it shows at this server's /verify page. Other players: Settings › Open in… on any title.
          </p>
        </Step>
      </ol>
      <div className="mt-2 flex justify-end">
        <button type="button" className={btn} onClick={() => void dismiss()}>Done</button>
      </div>
    </section>
  );
};

export default SetupGuide;
