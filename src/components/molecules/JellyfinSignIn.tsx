import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';
import { api } from '@/api/client';
import { useAuth } from '@/context/AuthContext';

/**
 * "Sign in with Jellyfin" on the login page (servers from 2026-10-29, when the admin turned it
 * on in Settings › Jellyfin). The username and password go to this server, which checks them
 * with Jellyfin and never stores the password.
 */
const JellyfinSignIn: React.FC<{ onSignedIn: () => void }> = ({ onSignedIn }) => {
  const { loginWithJellyfin } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ enabled: boolean }>('/auth/jellyfin/enabled')
      .then((r) => { if (!cancelled) setEnabled(Boolean(r.data?.enabled)); })
      .catch(() => { /* older server: no Jellyfin sign-in */ });
    return () => { cancelled = true; };
  }, []);

  if (!enabled) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setBusy(true);
    try {
      await loginWithJellyfin(username.trim(), password);
      toast.success('Signed in with Jellyfin');
      onSignedIn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Could not sign in with Jellyfin';
      if (/request for access has been sent/i.test(message)) toast.info(message, { autoClose: 8000 });
      else toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500';
  return (
    <div className="mt-4 w-full">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-xl border border-purple-700/60 bg-purple-950/40 py-3 text-sm font-bold text-purple-100 transition-colors hover:bg-purple-900/50"
        >
          Sign in with Jellyfin
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-purple-800/50 bg-purple-950/20 p-4">
          <p className="text-xs text-purple-200/80">Your Jellyfin username and password. They are checked by your Jellyfin server.</p>
          <input autoFocus value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Jellyfin username" autoComplete="username" className={field} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" className={field} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm text-gray-300 hover:bg-slate-800">
              Cancel
            </button>
            <button type="submit" disabled={busy || !username.trim()} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-sm font-bold text-white hover:bg-purple-500 disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default JellyfinSignIn;
