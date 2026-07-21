import React, { useState } from 'react';
import { RefreshCw, Users, UserCheck, UserCog, Clock, Wifi, Film, Tv2, PlayCircle, Radio, Server, AlertTriangle } from 'lucide-react';
import { StatCard } from '@/components/molecules/StatCard';
import { PortalTimelineChart } from '@/components/molecules/PortalTimelineChart';
import {
  useAdminStats,
  CATEGORY_ORDER,
  categoryColor,
  categoryLabel,
  kindLabel,
  kindColor,
  displayKind,
  formatDuration,
  formatRelativeSince,
  formatEventAge,
  ERROR_COLOR,
} from '@/hooks/useAdminStats';

const AdminStats: React.FC = () => {
  const {
    activeUserCount,
    socket,
    stats,
    loading,
    generatingStrm,
    streams,
    portalMetrics,
    liveEvents,
    refreshSecondsInput,
    setRefreshSecondsInput,
    applyRefreshSeconds,
    handleGenerateStrm,
    MIN_REFRESH_SECONDS,
  } = useAdminStats();
  const [streamFilter, setStreamFilter] = useState<'all' | 'live' | 'movie' | 'series'>('all');

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
        <div className="mb-4 flex items-center gap-3">
          <Server className="text-blue-500" size={20} />
          <h3 className="text-lg font-bold text-white">Stalker Portal Requests</h3>
          {portalMetrics && (
            <span className="ml-auto text-xs text-gray-500">
              since {formatRelativeSince(portalMetrics.since)}
            </span>
          )}
        </div>

        {!portalMetrics ? (
          <p className="text-sm italic text-gray-500">Loading portal request metrics…</p>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard icon={Server} label="Total Requests" value={portalMetrics.totalRequests.toLocaleString()} />
              <StatCard icon={AlertTriangle} label="Total Errors" value={portalMetrics.totalErrors.toLocaleString()} accent="text-red-500" />
              <StatCard
                icon={AlertTriangle}
                label="Error Rate"
                value={
                  portalMetrics.totalRequests > 0
                    ? `${((portalMetrics.totalErrors / portalMetrics.totalRequests) * 100).toFixed(1)}%`
                    : '0%'
                }
                accent={portalMetrics.totalErrors > 0 ? 'text-yellow-500' : 'text-green-500'}
              />
              <StatCard
                icon={Radio}
                label="Last Minute"
                value={portalMetrics.timeline[portalMetrics.timeline.length - 1]?.count ?? 0}
                accent="text-blue-500"
              />
            </div>

            {/* Category breakdown — horizontal bars, direct-labeled (required by the
                dataviz skill's CVD-floor warning for this 6-slot set), fixed hue order. */}
            <div className="mb-6 space-y-2">
              {CATEGORY_ORDER.map((cat) => {
                const count = portalMetrics.byCategory[cat] ?? 0;
                const max = Math.max(1, ...CATEGORY_ORDER.map((c) => portalMetrics.byCategory[c] ?? 0));
                const pct = (count / max) * 100;
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="w-14 flex-shrink-0 text-xs font-bold text-gray-400">{categoryLabel[cat]}</span>
                    <div className="h-4 flex-1 overflow-hidden rounded bg-gray-950">
                      <div
                        className="h-full rounded transition-all"
                        style={{ width: `${pct}%`, backgroundColor: categoryColor[cat] }}
                      />
                    </div>
                    <span className="w-14 flex-shrink-0 text-right font-mono text-xs text-gray-300">
                      {count.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>

            <PortalTimelineChart timeline={portalMetrics.timeline} />

            <div className="mt-6">
              <div className="mb-3 flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${socket ? 'animate-pulse bg-green-500' : 'bg-gray-600'}`} />
                <h4 className="text-sm font-bold text-gray-300">Live Requests</h4>
                <span className="text-xs text-gray-600">
                  {socket ? 'streaming in real time' : 'reconnecting…'}
                </span>
              </div>
              {liveEvents.length === 0 ? (
                <p className="text-sm italic text-gray-500">No recent portal requests.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-800 bg-gray-950/50">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-gray-950">
                      <tr className="border-b border-gray-800 text-[10px] uppercase tracking-widest text-gray-500">
                        <th className="py-1.5 pl-3 pr-2 font-black">Category</th>
                        <th className="py-1.5 pr-2 font-black">Outcome</th>
                        <th className="py-1.5 pr-2 font-black">HTTP Status</th>
                        <th className="py-1.5 pr-3 text-right font-black">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveEvents.slice(0, 50).map((event, i) => (
                        <tr key={`${event.timestamp}-${i}`} className="border-b border-gray-800/60 last:border-0">
                          <td className="py-1.5 pl-3 pr-2">
                            <span
                              className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-bold uppercase"
                              style={{ color: categoryColor[event.category], backgroundColor: `${categoryColor[event.category]}1a` }}
                            >
                              {categoryLabel[event.category]}
                            </span>
                          </td>
                          <td className="py-1.5 pr-2">
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="inline-block h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: event.outcome === 'error' ? ERROR_COLOR : '#0ca30c' }}
                              />
                              <span className={event.outcome === 'error' ? 'text-red-400' : 'text-gray-400'}>
                                {event.outcome === 'error' ? 'Error' : 'Success'}
                              </span>
                            </span>
                          </td>
                          <td className="py-1.5 pr-2 text-gray-400" title={event.statusCode ? undefined : 'No HTTP status reported for this request'}>
                            {event.statusCode ?? 'n/a'}
                          </td>
                          <td className="py-1.5 pr-3 text-right text-gray-500">
                            {formatEventAge(event.timestamp)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
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
