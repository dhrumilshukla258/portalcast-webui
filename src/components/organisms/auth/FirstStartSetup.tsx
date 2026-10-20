import React, { useState } from 'react';
import { api } from '@/api/client';

interface Props {
  minPasswordLength: number;
  /** Signs in with the new account (the normal email/password login). */
  onCreated: (email: string, password: string) => Promise<void>;
}

const errorText = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;

/**
 * First start (server has no admin yet and no ADMIN_PASSWORD): create the admin account
 * here, like Jellyfin's setup wizard. The server refuses once any admin exists.
 */
const FirstStartSetup: React.FC<Props> = ({ minPasswordLength, onCreated }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < minPasswordLength) {
      setError(`Use a password of at least ${minPasswordLength} characters`);
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/setup', { name: name.trim(), email: email.trim(), password });
      await onCreated(email.trim(), password);
    } catch (err) {
      setError(errorText(err, 'Could not create the admin account'));
    } finally {
      setBusy(false);
    }
  };

  const input =
    'w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-gray-100 outline-none focus:border-indigo-500';

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-3">
      <div className="mb-1 text-center">
        <h1 className="text-xl font-black text-white">Welcome to PortalCast</h1>
        <p className="mt-1 text-sm text-gray-400">Create the admin account to finish setting up this server.</p>
      </div>
      <input className={input} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      <input
        className={input}
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="username"
        required
      />
      <input
        className={input}
        type="password"
        placeholder={`Password (at least ${minPasswordLength} characters)`}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        required
      />
      <input
        className={input}
        type="password"
        placeholder="Repeat the password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
        required
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="mt-1 w-full rounded-xl bg-linear-to-r from-indigo-500 to-violet-600 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {busy ? 'Creating…' : 'Create admin account'}
      </button>
      <p className="text-center text-xs text-gray-500">
        API keys, email and everything else are set afterwards in Admin › Settings.
      </p>
    </form>
  );
};

export default FirstStartSetup;
