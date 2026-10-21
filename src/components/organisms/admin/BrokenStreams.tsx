import React from 'react';
import { RefreshCw, AlertTriangle, PlayCircle, Eye, X, CheckCircle2, XCircle } from 'lucide-react';
import { useStreamFailures, formatAgo } from '@/hooks/useStreamFailures';
import type { StreamFailure, StreamFailureItemType, StreamFailureStatus } from '@/api/types/admin';

const FILTERS: { id: StreamFailureStatus; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'hidden', label: 'Auto-hidden' },
  { id: 'all', label: 'All' },
];

const typeLabel: Record<StreamFailureItemType, string> = {
  movie: 'Movie',
  episode: 'Episode',
  live: 'Live',
};

const typeColor: Record<StreamFailureItemType, string> = {
  movie: 'bg-emerald-900/30 text-emerald-400',
  episode: 'bg-amber-900/30 text-amber-400',
  live: 'bg-blue-900/30 text-blue-400',
};

function StateBadge({ row }: { row: StreamFailure }) {
  if (row.autoHidden) {
    return (
      <span className="rounded-sm bg-red-900/30 px-2 py-0.5 text-[10px] font-black uppercase text-red-400">
        Auto-hidden
      </span>
    );
  }
  if (row.dismissed) {
    return (
      <span className="rounded-sm bg-gray-800 px-2 py-0.5 text-[10px] font-black uppercase text-gray-500">
        Dismissed
      </span>
    );
  }
  if (row.failureCount === 0) {
    return (
      <span className="rounded-sm bg-green-900/30 px-2 py-0.5 text-[10px] font-black uppercase text-green-400">
        Recovered
      </span>
    );
  }
  return (
    <span className="rounded-sm bg-yellow-900/30 px-2 py-0.5 text-[10px] font-black uppercase text-yellow-400">
      Watching
    </span>
  );
}

const actionBtn =
  'inline-flex items-center gap-1 rounded-lg border border-gray-800 bg-gray-950 px-2.5 py-1.5 text-xs font-bold text-gray-300 transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50';

const BrokenStreams: React.FC = () => {
  const { status, setStatus, items, loading, busy, testResults, refresh, test, unhide, dismiss } =
    useStreamFailures();

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white/[0.03] p-6">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <AlertTriangle className="text-yellow-500" size={20} />
          <h3 className="text-lg font-bold text-white">Broken Streams</h3>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex gap-1 rounded-xl border border-gray-800 bg-gray-950 p-1">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatus(f.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition-colors ${
                    status === f.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'
                  }`}
                  data-focusable="true"
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button onClick={refresh} className={actionBtn} title="Refresh" data-focusable="true">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        <p className="mb-4 text-xs text-gray-500">
          Titles the portal still lists but that failed to play. A movie that fails 3 separate playback attempts within
          24 hours is hidden automatically; episodes and live channels are only recorded. Test re-resolves the link on
          the server and fetches the first bytes.
        </p>

        {loading && items.length === 0 ? (
          <div className="flex h-24 items-center justify-center">
            <RefreshCw className="animate-spin text-blue-500" size={24} />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm italic text-gray-500">
            {status === 'hidden' ? 'Nothing has been auto-hidden.' : 'No broken streams recorded.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs uppercase tracking-widest text-gray-500">
                  <th className="pb-2 pr-4 font-black">Title</th>
                  <th className="pb-2 pr-4 font-black">Type</th>
                  <th className="pb-2 pr-4 font-black">Failures</th>
                  <th className="pb-2 pr-4 font-black">Last error</th>
                  <th className="pb-2 pr-4 font-black">Upstream</th>
                  <th className="pb-2 pr-4 font-black">Last failed</th>
                  <th className="pb-2 pr-4 font-black">State</th>
                  <th className="pb-2 font-black">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const result = testResults[row.id];
                  const rowBusy = busy[row.id];
                  return (
                    <tr key={row.id} className="border-b border-gray-800/60 align-top">
                      <td className="max-w-xs py-2 pr-4">
                        <div className="truncate text-xs text-gray-200" title={row.title ?? row.itemId}>
                          {row.title ?? <span className="italic text-gray-600">Unknown ({row.itemId})</span>}
                        </div>
                        <div className="truncate text-[11px] text-gray-500">{row.category ?? '—'}</div>
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`rounded-sm px-2 py-0.5 text-[10px] font-black uppercase ${typeColor[row.itemType]}`}>
                          {typeLabel[row.itemType]}
                        </span>
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-gray-300">
                        {row.failureCount}
                        {row.threshold && row.strikes != null && (
                          <span className="block text-xs text-slate-400" title="Only &quot;file not found&quot; failures count toward auto-hide">
                            {row.strikes}/{row.threshold} toward hide
                          </span>
                        )}
                      </td>
                      <td className="max-w-[16rem] py-2 pr-4 text-xs text-gray-400">
                        <span className="font-mono text-red-400">{row.lastStatus ?? 'net'}</span>{' '}
                        <span className="break-words" title={row.lastError ?? undefined}>
                          {row.lastError ?? '—'}
                        </span>
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-gray-400">{row.upstreamHost ?? '—'}</td>
                      <td
                        className="whitespace-nowrap py-2 pr-4 text-xs text-gray-400"
                        title={row.lastFailedAt ? new Date(row.lastFailedAt).toLocaleString() : undefined}
                      >
                        {formatAgo(row.lastFailedAt)}
                      </td>
                      <td className="py-2 pr-4">
                        <StateBadge row={row} />
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={() => test(row.id)}
                            disabled={!!rowBusy}
                            className={actionBtn}
                            data-focusable="true"
                          >
                            {rowBusy === 'test' ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <PlayCircle size={12} />
                            )}
                            Test now
                          </button>
                          {row.autoHidden && (
                            <button
                              onClick={() => unhide(row.id)}
                              disabled={!!rowBusy}
                              className={actionBtn}
                              data-focusable="true"
                            >
                              <Eye size={12} />
                              Unhide
                            </button>
                          )}
                          {!row.dismissed && (
                            <button
                              onClick={() => dismiss(row.id)}
                              disabled={!!rowBusy}
                              className={actionBtn}
                              title="Hide this row until it fails again"
                              data-focusable="true"
                            >
                              <X size={12} />
                              Dismiss
                            </button>
                          )}
                        </div>
                        {result && (
                          <div
                            className={`mt-1.5 flex items-start gap-1 text-[11px] ${
                              result.ok ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {result.ok ? (
                              <CheckCircle2 size={12} className="mt-px shrink-0" />
                            ) : (
                              <XCircle size={12} className="mt-px shrink-0" />
                            )}
                            <span>
                              {result.ok
                                ? `Playable (HTTP ${result.status ?? '?'})${row.autoHidden ? ' — unhide to restore it' : ''}`
                                : `${result.status ? `HTTP ${result.status}: ` : ''}${result.error ?? 'Failed'}`}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrokenStreams;
