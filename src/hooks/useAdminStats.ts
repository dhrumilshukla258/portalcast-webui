import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '@/api/client';
import { useSocket } from '@/context/useSocket';
import { useAuth } from '@/context/AuthContext';

const DEFAULT_REFRESH_MS = 5000;
const MIN_REFRESH_SECONDS = 1;

export interface RecentLogin {
  id: number;
  name: string;
  email: string;
  role: string;
  lastLogin: string;
}

export interface Stats {
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

export type PortalCategory = 'live' | 'movie' | 'series' | 'epg' | 'auth' | 'other';

export interface PortalRequestEvent {
  timestamp: string;
  category: PortalCategory;
  outcome: 'success' | 'error';
  statusCode?: number;
}

export interface PortalMetrics {
  totalRequests: number;
  totalErrors: number;
  since: string;
  byCategory: Record<PortalCategory, number>;
  timeline: { bucket: string; count: number; errorCount: number }[];
  recent: PortalRequestEvent[];
}

// Live feed keeps more than it renders — bounded so a long-open admin tab
// can't accumulate unbounded memory from a busy portal.
const MAX_LIVE_EVENTS = 200;

// Fixed order + validated (dataviz skill: node scripts/validate_palette.js,
// dark mode, all checks pass) — categorical hue slots 1/2/3/4/5/6 from
// references/palette.md, assigned in this fixed order rather than cycled.
export const CATEGORY_ORDER: PortalCategory[] = ['live', 'movie', 'series', 'epg', 'auth', 'other'];
export const categoryColor: Record<PortalCategory, string> = {
  live: '#3987e5',
  movie: '#199e70',
  series: '#c98500',
  epg: '#008300',
  auth: '#9085e9',
  other: '#e66767',
};
export const categoryLabel: Record<PortalCategory, string> = {
  live: 'Live',
  movie: 'Movie',
  series: 'Series',
  epg: 'EPG',
  auth: 'Auth',
  other: 'Other',
};
// Status red (references/palette.md status palette — "critical"), kept
// distinct from the categorical slots above since errors are a status, not
// a content-type identity.
export const ERROR_COLOR = '#d03b3b';

export interface StreamSession {
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
export function displayKind(s: StreamSession): 'live' | 'movie' | 'series' | 'other' {
  if (s.kind) return s.kind;
  if (s.type === 'live') return 'live';
  return 'other';
}

export const kindLabel: Record<'live' | 'movie' | 'series' | 'other', string> = {
  live: 'Live Stream',
  movie: 'Movie',
  series: 'Series',
  other: 'Other',
};

export const kindColor: Record<'live' | 'movie' | 'series' | 'other', string> = {
  live: 'bg-red-900/30 text-red-400',
  movie: 'bg-blue-900/30 text-blue-400',
  series: 'bg-indigo-900/30 text-indigo-400',
  other: 'bg-gray-800 text-gray-300',
};

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export function formatRelativeSince(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m ago`;
  return `${m}m ago`;
}

export function formatEventAge(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 1) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

// Owns every data-fetch/polling concern for the Stats tab: the one-shot
// initial load, the admin-configurable live-streams poll, the fixed-cadence
// portal-metrics poll, and the real-time portal-request socket feed. The
// component itself only owns display-only state (stream type filter).
export function useAdminStats() {
  const { activeUserCount, socket } = useSocket();
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingStrm, setGeneratingStrm] = useState(false);
  const [streams, setStreams] = useState<StreamSession[]>([]);
  const [, forceTick] = useState(0);
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

  const [portalMetrics, setPortalMetrics] = useState<PortalMetrics | null>(null);
  // Seeded once from the initial snapshot's `recent` (last 200 events, so
  // there's no gap before the socket stream takes over), then the socket
  // subscription below prepends anything newer.
  const [liveEvents, setLiveEvents] = useState<PortalRequestEvent[]>([]);
  const liveFeedSeeded = useRef(false);

  const loadPortalMetrics = async (signal?: AbortSignal) => {
    try {
      const res = await api.get<PortalMetrics>('/admin/portal-metrics', { signal });
      setPortalMetrics(res.data);
      if (!liveFeedSeeded.current && res.data.recent) {
        liveFeedSeeded.current = true;
        // API returns oldest→newest (matches the timeline convention) — the
        // feed displays newest-first.
        setLiveEvents([...res.data.recent].reverse().slice(0, MAX_LIVE_EVENTS));
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        // silent — polls in the background, don't spam toasts
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    loadStreams(controller.signal);
    loadPortalMetrics(controller.signal);
    return () => controller.abort();
  }, []);

  // Portal request volume changes slowly relative to the live-streams list —
  // a fixed 30s cadence is plenty and keeps this independent of the
  // admin-configurable stream-list refresh rate above. (This refreshes the
  // aggregate totals/timeline/category breakdown; the live feed itself comes
  // from the socket subscription below, not this poll.)
  useEffect(() => {
    const interval = setInterval(() => loadPortalMetrics(), 30000);
    return () => clearInterval(interval);
  }, []);

  // Real-time feed — mirrors the log-console pattern exactly (start_logging/
  // server_log in LogsTab.tsx): subscribe on mount, unsubscribe on unmount.
  useEffect(() => {
    if (!socket || !token) return;

    const handlePortalRequest = (event: PortalRequestEvent) => {
      setLiveEvents((prev) => [event, ...prev].slice(0, MAX_LIVE_EVENTS));
    };

    // Server now requires the admin JWT in the join payload — without it the
    // join is silently ignored (fail-closed, no error emitted back).
    socket.emit('start_portal_metrics', { token });
    socket.on('portal_request', handlePortalRequest);

    return () => {
      socket.emit('stop_portal_metrics');
      socket.off('portal_request', handlePortalRequest);
    };
  }, [socket, token]);

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

  return {
    activeUserCount,
    socket,
    stats,
    loading,
    generatingStrm,
    streams,
    portalMetrics,
    liveEvents,
    refreshInterval,
    refreshSecondsInput,
    setRefreshSecondsInput,
    applyRefreshSeconds,
    handleGenerateStrm,
    MIN_REFRESH_SECONDS,
  };
}
