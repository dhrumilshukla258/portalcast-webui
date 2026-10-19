import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  getOpenSubtitlesStatus,
  linkOpenSubtitles,
  unlinkOpenSubtitles,
  setSubdlKey,
  removeSubdlKey,
  type OpenSubtitlesLinkStatus,
} from '@/api/endpoints/user';

type OpenSubtitlesModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const inputClass =
  'w-full rounded-lg border border-gray-600/50 bg-gray-800/50 p-2 text-white placeholder-gray-500 backdrop-blur-xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500';
const primaryBtn =
  'rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 active:scale-95 disabled:opacity-50';
const dangerBtn =
  'rounded-lg bg-red-600/80 px-3 py-2 text-sm font-semibold text-white transition-all hover:bg-red-500 focus:outline-hidden focus:ring-2 focus:ring-red-500 active:scale-95 disabled:opacity-50';

const errorText = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;

/**
 * The user's own subtitle accounts: OpenSubtitles login and/or API key, and a SubDL key.
 * Downloads then use their own quota and work even when the server has no key. Keys and
 * passwords are verified and stored encrypted by the server and never shown again.
 */
const OpenSubtitlesModal: React.FC<OpenSubtitlesModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<OpenSubtitlesLinkStatus | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [osKey, setOsKey] = useState('');
  const [subdlKey, setSubdlKeyInput] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    getOpenSubtitlesStatus()
      .then(setStatus)
      .catch(() => setStatus({ linked: false, username: null }));
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setStatus(null);
    refresh();
  }, [isOpen, refresh]);

  if (!isOpen) return null;

  const run = async (fn: () => Promise<void>, ok: string, fail: string) => {
    setLoading(true);
    try {
      await fn();
      toast.success(ok);
      setPassword('');
      setOsKey('');
      setSubdlKeyInput('');
      refresh();
    } catch (err) {
      toast.error(errorText(err, fail));
    } finally {
      setLoading(false);
    }
  };

  const saveOpenSubtitles = () => {
    if (!username && !osKey) return toast.error('Enter your OpenSubtitles login or API key');
    if (username && !password) return toast.error('Enter your OpenSubtitles password');
    void run(() => linkOpenSubtitles(username, password, osKey || undefined), 'OpenSubtitles saved', 'Could not save — check your details');
  };

  const osKeyLine = !status
    ? null
    : status.hasOwnApiKey
      ? 'Using your own API key'
      : status.serverHasApiKey
        ? "Using the server's API key"
        : 'No API key yet — add one (free at opensubtitles.com/consumers)';
  const subdl = status?.subdl;

  return (
    <div className="animate-fade-in fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-xs">
      <div
        className="animate-scale-in max-h-[90vh] w-full max-w-md scale-100 overflow-y-auto rounded-2xl border border-gray-700/50 bg-gray-900/90 p-6 shadow-2xl backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="opensubtitles-modal-title"
      >
        <h3 id="opensubtitles-modal-title" className="mb-2 text-xl font-bold text-white">
          Subtitle Accounts
        </h3>
        <p className="mb-5 text-sm text-gray-300">
          Use your own accounts so subtitle downloads use your personal quota. Details are checked, then
          stored encrypted on your server.
        </p>

        {!status ? (
          <p className="mb-6 text-sm text-gray-500">Loading…</p>
        ) : (
          <>
            {/* OpenSubtitles */}
            <div className="mb-2 text-sm font-semibold text-white">OpenSubtitles</div>
            <div className="mb-3 rounded-lg border border-gray-700/50 bg-gray-800/40 p-3 text-sm">
              <p className={status.linked ? 'font-semibold text-emerald-400' : 'text-gray-300'}>
                {status.linked ? `Signed in as ${status.username}` : 'Not signed in'}
              </p>
              {osKeyLine && <p className="mt-1 text-xs text-gray-400">{osKeyLine}</p>}
            </div>
            <div className="mb-3 space-y-2">
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="OpenSubtitles username" data-focusable="true" className={inputClass} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Password" data-focusable="true" className={inputClass} />
              <input type="password" value={osKey} onChange={(e) => setOsKey(e.target.value)}
                placeholder="API key (optional — only if the server has none)" data-focusable="true" className={inputClass} />
            </div>
            <div className="mb-6 flex justify-end gap-2">
              {(status.linked || status.hasOwnApiKey) && (
                <button onClick={() => void run(unlinkOpenSubtitles, 'OpenSubtitles removed', 'Could not remove')}
                  disabled={loading} data-focusable="true" className={dangerBtn}>Remove</button>
              )}
              <button onClick={saveOpenSubtitles} disabled={loading} data-focusable="true" className={primaryBtn}>
                Save
              </button>
            </div>

            {/* SubDL */}
            <div className="mb-2 text-sm font-semibold text-white">SubDL</div>
            <div className="mb-3 rounded-lg border border-gray-700/50 bg-gray-800/40 p-3 text-sm text-gray-300">
              {subdl?.hasOwnApiKey
                ? 'Using your own API key'
                : subdl?.serverHasApiKey
                  ? "Using the server's API key"
                  : 'No API key — free at subdl.com'}
            </div>
            <input type="password" value={subdlKey} onChange={(e) => setSubdlKeyInput(e.target.value)}
              placeholder="SubDL API key" data-focusable="true" className={`${inputClass} mb-3`} />
            <div className="mb-6 flex justify-end gap-2">
              {subdl?.hasOwnApiKey && (
                <button onClick={() => void run(removeSubdlKey, 'SubDL key removed', 'Could not remove')}
                  disabled={loading} data-focusable="true" className={dangerBtn}>Remove</button>
              )}
              <button
                onClick={() => (subdlKey ? void run(() => setSubdlKey(subdlKey), 'SubDL key saved', 'SubDL rejected that key') : toast.error('Enter your SubDL API key'))}
                disabled={loading} data-focusable="true" className={primaryBtn}>
                Save
              </button>
            </div>
          </>
        )}

        <div className="flex justify-end">
          <button
            onClick={onClose}
            data-focusable="true"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-400 transition-colors hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white focus:outline-hidden focus:ring-2 focus:ring-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpenSubtitlesModal;
