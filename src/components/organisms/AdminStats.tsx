import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { RefreshCw, Users, UserCheck, UserCog, Clock, Wifi, Film, Tv2, PlayCircle, Radio } from 'lucide-react';
import { api } from '@/services/api';
import { useSocket } from '@/context/useSocket';

const DEFAULT_REFRESH_MS = 5000;
const MIN_REFRESH_SECONDS = 1;

interface RecentLogin {
  id: number;
  name: string;
  email: string;
  role: string;
  lastLogin: string;
}

interface Stats {
  users: {
    total: number;
    active: number;
    pending: number;
    admins: number;
    loggedInLast24h: number;
    loggedInLast7d: number;
  };
  recentLogins: RecentLogin[];
  connectedDevices: number;
  activeStreams: number;
  strm: {
    movies: number;
    episodes: number;
  };
}

interface StreamSession {
  key: string;
  type: 'proxy' | 'live' | 'vod';
  ip: string;
  resource: string;
  user: string | null;
  kind: 'live' | 'movie' | 'series' | null;
  label: string | null;
  category: string | null;
  startedAt: number;
  lastSeen: number;
}

// `kind` is the actual content type (set at the point a channel/movie/series
// link is generated) — falls back to the transport `type` for older/edge-case
// sessions that didn't carry it (e.g. generic asset proxying).
function displayKind(s: StreamSession): 'live' | 'movie' | 'series' | 'other' {
  if (s.kind) return s.kind;
  if (s.type === 'live') return 'live';
  return 'other';
}

const kindLabel: Record<'live' | 'movie' | 'series' | 'other', string> = {
  live: 'Live Stream',
  movie: 'Movie',
  series: 'Series',
  other: 'Other',
};

const kindColor: Record<'live' | 'movie' | 'series' | 'other', string> = {
  live: 'bg-red-900/30 text-red-400',
  movie: 'bg-blue-900/30 text-blue-400',
  series: 'bg-indigo-900/30 text-indigo-400',
  other: 'bg-gray-800 text-gray-300',
};

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: React.ReactNode; accent?: string }> = ({
  icon: Icon,
  label,
  value,
  accent = 'text-blue-500',
}) => (
  <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-5">
    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500">
      <Icon size={14} className={accent} />
      {label}
    </div>
    <div className="mt-2 text-2xl font-black text-white">{value}</div>
  </div>
);

const AdminStats: React.FC = () => {
  const { activeUserCount } = useSocket();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingStrm, setGeneratingStrm] = useState(false);
  const [streams, setStreams] = useState<StreamSession[]>([]);
  const [, forceTick] = useState(0);
  const [streamFilter, setStreamFilter] = useState<'all' | 'live' | 'movie' | 'series'>('all');
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    const saved = Number(localStorage.getItem('admin_stream_refresh_ms'));
    return saved >= MIN_REFRESH_SECONDS * 1000 ? saved : DEFAULT_REFRESH_MS;
  });
  const [refreshSecondsInput, setRefreshSecondsInput] = useState<string>(() =>
    String(refreshInterval / 1000)
  );

  const load = async (signal?: AbortSignal) => {
    try {
      const res = await api.get<Stats>('/admin/stats', { signal });
      setStats(res.data);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error('Failed to load stats');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStreams = async (signal?: AbortSignal) => {
    try {
      const res = await api.get<{ count: number; sessions: StreamSession[] }>('/admin/streams', { signal });
      setStreams(res.data.sessions);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        // silent — this polls frequently, don't spam toasts
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    loadStreams(controller.signal);
    return () => controller.abort();
  }, []);

  // Live streams list polls at an admin-configurable interval. Note: this only
  // controls how often the browser re-fetches the list — the backend's own
  // idle timeout (20s, how long a session is considered "active" without a
  // fresh request) is independent, so any poll rate here is safe to pick.
  useEffect(() => {
    const interval = setInterval(() => {
      loadStreams();
      forceTick((t) => t + 1); // re-render so "duration" labels keep ticking
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const applyRefreshSeconds = (raw: string) => {
    const seconds = Number(raw);
    if (!raw || Number.isNaN(seconds) || seconds < MIN_REFRESH_SECONDS) {
      // Invalid — snap the input back to the last valid value.
      setRefreshSecondsInput(String(refreshInterval / 1000));
      return;
    }
    const ms = Math.round(seconds * 1000);
    setRefreshInterval(ms);
    localStorage.setItem('admin_stream_refresh_ms', String(ms));
  };

  const handleGenerateStrm = async () => {
    setGeneratingStrm(true);
    try {
      const res = await api.post<{ success?: boolean; message?: string; error?: string }>('/admin/strm/generate');
      if (res.data.error) {
        toast.error(res.data.error);
      } else {
        toast.success(res.data.message || 'STRM generation started');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start STRM generation';
      toast.error(message);
    } finally {
      setGeneratingStrm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <RefreshCw className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Users" value={stats?.users.total ?? '—'} />
        <StatCard icon={UserCheck} label="Active" value={stats?.users.active ?? '—'} accent="text-green-500" />
        <StatCard icon={Clock} label="Pending" value={stats?.users.pending ?? '—'} accent="text-yellow-500" />
        <StatCard icon={UserCog} label="Admins" value={stats?.users.admins ?? '—'} accent="text-purple-500" />
        <StatCard icon={Clock} label="Logged in (24h)" value={stats?.users.loggedInLast24h ?? '—'} />
        <StatCard icon={Clock} label="Logged in (7d)" value={stats?.users.loggedInLast7d ?? '—'} />
        <StatCard
          icon={Wifi}
          label="Connected now"
          value={activeUserCount ?? stats?.connectedDevices ?? 0}
          accent="text-green-500"
        />
        <StatCard icon={Radio} label="Streams active" value={streams.length} accent="text-red-500" />
        <StatCard icon={Film} label="STRM Movies" value={stats?.strm.movies ?? '—'} />
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          <h3 className="text-lg font-bold text-white">Live Streams</h3>
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            refresh every
            <input
              type="number"
              min={MIN_REFRESH_SECONDS}
              step="any"
              value={refreshSecondsInput}
              onChange={(e) => setRefreshSecondsInput(e.target.value)}
              onBlur={(e) => applyRefreshSeconds(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyRefreshSeconds((e.target as HTMLInputElement).value)}
              className="w-14 rounded-lg border border-gray-800 bg-gray-950 px-2 py-1 text-center text-xs text-white outline-none focus:border-blue-500"
            />
            sec
          </label>
          <div className="ml-auto flex gap-1 rounded-xl border border-gray-800 bg-gray-950 p-1">
            {(['all', 'live', 'movie', 'series'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStreamFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition-colors ${
                  streamFilter === f ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'
                }`}
                data-focusable="true"
              >
                {f === 'all' ? 'All' : kindLabel[f]}
              </button>
            ))}
          </div>
        </div>
        {(() => {
          const filtered = streamFilter === 'all' ? streams : streams.filter((s) => displayKind(s) === streamFilter);
          return filtered.length === 0 ? (
            <p className="text-sm italic text-gray-500">No active streams right now.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-xs uppercase tracking-widest text-gray-500">
                    <th className="pb-2 pr-4 font-black">Type</th>
                    <th className="pb-2 pr-4 font-black">Title</th>
                    <th className="pb-2 pr-4 font-black">Category</th>
                    <th className="pb-2 pr-4 font-black">User</th>
                    <th className="pb-2 pr-4 font-black">Client IP</th>
                    <th className="pb-2 font-black">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const kind = displayKind(s);
                    return (
                      <tr key={s.key} className="border-b border-gray-800/60">
                        <td className="py-2 pr-4">
                          <span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${kindColor[kind]}`}>
                            {kindLabel[kind]}
                          </span>
                        </td>
                        <td className="max-w-xs truncate py-2 pr-4 text-xs text-gray-200" title={s.label ?? s.resource}>
                          {s.label ?? <span className="italic text-gray-600" title={s.resource}>Unknown</span>}
                        </td>
                        <td className="py-2 pr-4 text-xs text-gray-400">{s.category ?? '—'}</td>
                        <td className="py-2 pr-4 text-xs text-gray-200">
                          {s.user ? (
                            s.user.startsWith('xtream:') ? (
                              <span className="text-purple-400">{s.user.slice(7)} <span className="text-gray-600">(Xtream)</span></span>
                            ) : (
                              s.user
                            )
                          ) : (
                            <span className="italic text-gray-600">Unknown</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 font-mono text-xs text-gray-300">{s.ip}</td>
                        <td className="py-2 text-gray-400">{formatDuration(Date.now() - s.startedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-white">
              <PlayCircle className="text-blue-500" size={20} />
              STRM File Generation
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Generate .strm files for Jellyfin/Plex from the current VOD/series catalog ({stats?.strm.movies ?? 0} movies,{' '}
              {stats?.strm.episodes ?? 0} episodes on disk).
            </p>
          </div>
          <button
            onClick={handleGenerateStrm}
            disabled={generatingStrm}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-colors hover:bg-blue-500 disabled:opacity-50"
            data-focusable="true"
          >
            <RefreshCw size={16} className={generatingStrm ? 'animate-spin' : ''} />
            {generatingStrm ? 'Starting...' : 'Generate STRM Files'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
          <Tv2 className="text-blue-500" size={20} />
          Recent Logins
        </h3>
        {!stats?.recentLogins.length ? (
          <p className="text-sm italic text-gray-500">No login activity recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs uppercase tracking-widest text-gray-500">
                  <th className="pb-2 pr-4 font-black">Name</th>
                  <th className="pb-2 pr-4 font-black">Email</th>
                  <th className="pb-2 pr-4 font-black">Role</th>
                  <th className="pb-2 font-black">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentLogins.map((u) => (
                  <tr key={u.id} className="border-b border-gray-800/60">
                    <td className="py-2 pr-4 text-gray-200">{u.name}</td>
                    <td className="py-2 pr-4 text-gray-400">{u.email}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${u.role === 'admin' ? 'bg-purple-900/30 text-purple-400' : 'bg-gray-800 text-gray-400'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2 text-gray-400">{new Date(u.lastLogin).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminStats;
