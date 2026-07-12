import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  getOpenSubtitlesStatus,
  linkOpenSubtitles,
  unlinkOpenSubtitles,
} from '@/api/endpoints/user';

type OpenSubtitlesModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const OpenSubtitlesModal: React.FC<OpenSubtitlesModalProps> = ({ isOpen, onClose }) => {
  const [linked, setLinked] = useState(false);
  const [linkedUsername, setLinkedUsername] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusLoaded, setStatusLoaded] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStatusLoaded(false);
    getOpenSubtitlesStatus()
      .then((data) => {
        setLinked(Boolean(data?.linked));
        setLinkedUsername(data?.username ?? null);
      })
      .catch(() => {
        setLinked(false);
        setLinkedUsername(null);
      })
      .finally(() => setStatusLoaded(true));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLink = async () => {
    if (!username || !password) {
      toast.error('Enter your OpenSubtitles username and password');
      return;
    }
    setLoading(true);
    try {
      await linkOpenSubtitles(username, password);
      toast.success('OpenSubtitles account linked');
      setLinked(true);
      setLinkedUsername(username);
      setPassword('');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to link account — check your credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    setLoading(true);
    try {
      await unlinkOpenSubtitles();
      toast.success('OpenSubtitles account unlinked');
      setLinked(false);
      setLinkedUsername(null);
      setUsername('');
    } catch {
      toast.error('Failed to unlink account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        className="animate-scale-in w-full max-w-md scale-100 rounded-2xl border border-gray-700/50 bg-gray-900/90 p-6 shadow-2xl backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="opensubtitles-modal-title"
      >
        <h3 id="opensubtitles-modal-title" className="mb-2 text-xl font-bold text-white">
          Subtitle Account
        </h3>
        <p className="mb-6 text-sm text-gray-300">
          Link your own OpenSubtitles account so downloads use your personal quota instead of
          the server's shared one.
        </p>

        {!statusLoaded ? (
          <p className="mb-6 text-sm text-gray-500">Loading…</p>
        ) : linked ? (
          <div className="mb-6 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
            <p className="text-sm font-semibold text-emerald-400">
              Linked as {linkedUsername}
            </p>
          </div>
        ) : (
          <div className="mb-6 space-y-3">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="OpenSubtitles username"
              data-focusable="true"
              className="w-full rounded-lg border border-gray-600/50 bg-gray-800/50 p-2 text-white placeholder-gray-500 backdrop-blur-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="OpenSubtitles password"
              data-focusable="true"
              className="w-full rounded-lg border border-gray-600/50 bg-gray-800/50 p-2 text-white placeholder-gray-500 backdrop-blur-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            data-focusable="true"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-400 transition-colors hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Close
          </button>
          {linked ? (
            <button
              onClick={handleUnlink}
              disabled={loading}
              data-focusable="true"
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-red-900/20 transition-all hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 active:scale-95 disabled:opacity-50"
            >
              Unlink
            </button>
          ) : (
            <button
              onClick={handleLink}
              disabled={loading}
              data-focusable="true"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-95 disabled:opacity-50"
            >
              Link Account
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpenSubtitlesModal;
