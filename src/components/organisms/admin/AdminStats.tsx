import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PortalTimelineChart } from '@/components/molecules/PortalTimelineChart';
import {
  useAdminStats,
  CATEGORY_ORDER,
  categoryColor,
  categoryLabel,
  kindLabel,
  displayKind,
  formatDuration,
  formatRelativeSince,
  formatEventAge,
  ERROR_COLOR,
} from '@/hooks/useAdminStats';
import { formatAgo } from '@/hooks/useStreamFailures';

const H2 = 'mb-3 text-sm font-semibold text-gray-400';

/**
 * Admin > IPTV > Activity: who is streaming, how much the IPTV portal is asked, and recent
 * sign-ins. Totals are single lines; the per-request feed is opt-in (it subscribes to the
 * live socket only while shown). Nothing polls while the browser tab is hidden.
 */
const AdminStats: React.FC = () => {
  const [showFeed, setShowFeed] = useState(false);
  const {
    stats,
    loading,
    streams,
    portalMetrics,
    liveEvents,
    socket,
    refreshSecondsInput,
    setRefreshSecondsInput,
    applyRefreshSeconds,
    MIN_REFRESH_SECONDS,
  } = useAdminStats(showFeed);
  const [streamFilter, setStreamFilter] = useState<'all' | 'live' | 'movie' | 'series'>('all');

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-500" /></div>;
  }

  const filtered = streamFilter === 'all' ? streams : streams.filter((s) => displayKind(s) === streamFilter);
  const m = portalMetrics;
  const lastMinute = m?.timeline[m.timeline.length - 1]?.count ?? 0;

  return (
    <div className="space-y-12">
      {/* Streams */}
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 className="text-sm font-semibold text-gray-400">Streaming now · {streams.length}</h2>
          <div className="flex gap-3 text-xs">
            {(['all', 'live', 'movie', 'series'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStreamFilter(f)}
                data-focusable="true"
                className={streamFilter === f ? 'font-semibold text-white' : 'text-gray-500 hover:text-gray-300'}
              >
                {f === 'all' ? 'All' : kindLabel[f]}
              </button>
            ))}
          </div>
          <label className="ml-auto flex items-center gap-1.5 text-xs text-gray-600">
            refresh every
            <input
              type="number"
              min={MIN_REFRESH_SECONDS}
              step="any"
              value={refreshSecondsInput}
              onChange={(e) => setRefreshSecondsInput(e.target.value)}
              onBlur={(e) => applyRefreshSeconds(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyRefreshSeconds((e.target as HTMLInputElement).value)}
              className="w-12 rounded-md bg-white/5 px-1.5 py-0.5 text-center text-xs text-gray-200 outline-hidden focus:ring-1 focus:ring-sky-400"
            />
            s
          </label>
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-600">Nobody right now.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {filtered.map((s) => {
              const kind = displayKind(s);
              return (
                <li key={s.key} className="flex items-center gap-4 py-2.5 text-sm">
                  <span className="w-32 shrink-0 truncate font-medium text-gray-200">{s.user ?? 'Unknown'}</span>
                  <span className="min-w-0 flex-1 truncate text-gray-300" title={s.label ?? s.resource}>
                    {s.label ?? 'Unknown'}
                    <span className="ml-2 text-xs text-gray-600">{kindLabel[kind]}{s.category ? ` · ${s.category}` : ''}</span>
                  </span>
                  <span className="hidden shrink-0 font-mono text-xs text-gray-600 sm:inline">{s.ip}</span>
                  <span className="w-16 shrink-0 text-right tabular-nums text-gray-500">{formatDuration(Date.now() - s.startedAt)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* IPTV portal requests */}
      <section>
        <h2 className={H2}>Requests to the IPTV portal</h2>
        {!m ? (
          <p className="text-sm text-gray-600">Loading…</p>
        ) : (
          <>
            <p className="mb-5 text-sm text-gray-300">
              {m.totalRequests.toLocaleString()} since {formatRelativeSince(m.since)}
              <span className="text-gray-500">
                {'  ·  '}
                {m.totalErrors === 0
                  ? 'none failed'
                  : `${m.totalErrors.toLocaleString()} failed (${((m.totalErrors / Math.max(1, m.totalRequests)) * 100).toFixed(1)}%)`}
                {'  ·  '}
                {lastMinute} in the last minute
              </span>
            </p>
            {/* By type: thin bars, direct-labeled, fixed hue order (validated palette). */}
            <div className="mb-6 max-w-xl space-y-1.5">
              {CATEGORY_ORDER.filter((cat) => (m.byCategory[cat] ?? 0) > 0).map((cat) => {
                const count = m.byCategory[cat] ?? 0;
                const max = Math.max(1, ...CATEGORY_ORDER.map((c) => m.byCategory[c] ?? 0));
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="w-12 shrink-0 text-xs text-gray-500">{categoryLabel[cat]}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full" style={{ width: `${(count / max) * 100}%`, backgroundColor: categoryColor[cat] }} />
                    </div>
                    <span className="w-14 shrink-0 text-right text-xs tabular-nums text-gray-400">{count.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
            <PortalTimelineChart timeline={m.timeline} />
            <button
              type="button"
              data-focusable="true"
              onClick={() => setShowFeed((v) => !v)}
              className="mt-4 text-xs font-medium text-gray-500 hover:text-gray-300"
            >
              {showFeed ? 'Hide each request' : 'Show each request as it happens'}
            </button>
            {showFeed && (
              <div className="mt-3">
                <p className="mb-2 flex items-center gap-2 text-xs text-gray-600">
                  <span className={`h-1.5 w-1.5 rounded-full ${socket ? 'animate-pulse bg-emerald-400' : 'bg-gray-600'}`} />
                  {socket ? 'live' : 'reconnecting…'}
                </p>
                {liveEvents.length === 0 ? (
                  <p className="text-sm text-gray-600">No requests yet.</p>
                ) : (
                  <ul className="max-h-64 divide-y divide-white/5 overflow-y-auto text-xs">
                    {liveEvents.slice(0, 50).map((e, i) => (
                      <li key={`${e.timestamp}-${i}`} className="flex items-center gap-3 py-1.5">
                        <span className="w-14 font-medium" style={{ color: categoryColor[e.category] }}>{categoryLabel[e.category]}</span>
                        <span className="flex-1" style={{ color: e.outcome === 'error' ? ERROR_COLOR : undefined }}>
                          {e.outcome === 'error' ? `Failed${e.statusCode ? ` (${e.statusCode})` : ''}` : <span className="text-gray-500">OK</span>}
                        </span>
                        <span className="text-gray-600">{formatEventAge(e.timestamp)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* Sign-ins */}
      <section>
        <h2 className={H2}>
          Recent sign-ins
          {stats && (
            <span className="ml-2 font-normal text-gray-600">
              {stats.users.loggedInLast24h} today · {stats.users.loggedInLast7d} this week
            </span>
          )}
        </h2>
        {!stats?.recentLogins.length ? (
          <p className="text-sm text-gray-600">No sign-ins yet.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {stats.recentLogins.map((u) => (
              <li key={u.id} className="flex items-center gap-4 py-2 text-sm" title={u.email}>
                <span className="min-w-0 flex-1 truncate text-gray-200">
                  {u.name}
                  {u.role === 'admin' && <span className="ml-2 text-xs text-gray-600">admin</span>}
                </span>
                <span className="text-gray-500" title={new Date(u.lastLogin).toLocaleString()}>{formatAgo(u.lastLogin)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default AdminStats;
