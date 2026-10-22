import React, { useState } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import { getOverview, type AdminOverview as Overview } from '@/api/endpoints/admin';
import { useVisiblePoll } from '@/hooks/useVisiblePoll';
import { formatDuration } from '@/hooks/useAdminStats';

/** Where a "Needs you" row leads: an Admin section and page. */
export type AdminTarget = { section: string; page: string };

const REFRESH_MS = 10_000;

const KIND_LABEL: Record<string, string> = { live: 'Live TV', movie: 'Movie', series: 'Series' };

function uptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * Admin front page, calm by default: one health line, a "Needs you" list that only appears
 * when something needs the admin, who is watching now, and one line of today's numbers.
 * One request every 10 s while the page is visible (GET /api/admin/overview).
 */
const AdminOverview: React.FC<{ onOpen: (t: AdminTarget) => void }> = ({ onOpen }) => {
  const [data, setData] = useState<Overview | null>(null);
  const [failed, setFailed] = useState(false);

  useVisiblePoll(async (signal) => {
    try {
      setData(await getOverview(signal));
      setFailed(false);
    } catch {
      if (!signal.aborted) setFailed(true);
    }
  }, REFRESH_MS);

  if (!data) {
    return failed ? (
      <p className="py-16 text-center text-sm text-gray-500">Could not reach the server.</p>
    ) : (
      <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-500" /></div>
    );
  }

  const n = data.needs;
  const needs: { text: string; target: AdminTarget; urgent?: boolean }[] = [];
  if (n.iptvOffline) needs.push({ text: 'IPTV provider is not answering', target: { section: 'iptv', page: 'provider' }, urgent: true });
  if (n.pendingUsers) needs.push({ text: `${plural(n.pendingUsers, 'user')} waiting for approval`, target: { section: 'people', page: 'users' } });
  if (n.brokenStreams) needs.push({ text: `${plural(n.brokenStreams, 'broken stream')}`, target: { section: 'iptv', page: 'broken' } });
  if (n.securityAlerts) needs.push({ text: `${plural(n.securityAlerts, 'security alert')} today`, target: { section: 'server', page: 'security' }, urgent: true });
  for (const j of n.failedJobs) needs.push({ text: `${j.label} failed`, target: { section: 'server', page: 'settings' } });
  if (n.catalogDifferences) needs.push({ text: `${plural(n.catalogDifferences, 'answer')} from the in-memory catalog differed from the database (see the server log)`, target: { section: 'server', page: 'settings' }, urgent: false });
  if (n.dataIssues) needs.push({ text: `${plural(n.dataIssues, 'stored-data problem')} the nightly check could not repair`, target: { section: 'server', page: 'settings' }, urgent: true });
  if (n.missingLocal) needs.push({ text: `${plural(n.missingLocal, 'local title')} missing from the NAS`, target: { section: 'content', page: 'libraries' } });
  if (n.unmatchedLocal) needs.push({ text: `${plural(n.unmatchedLocal, 'local title')} not matched`, target: { section: 'content', page: 'libraries' } });

  const allGood = !n.iptvOffline && n.securityAlerts === 0 && n.failedJobs.length === 0 && !n.dataIssues && !n.catalogDifferences;
  const t = data.today;
  const today = [
    t.activeUsers ? plural(t.activeUsers, 'person', 'people') + ' active' : null,
    t.connectedDevices ? plural(t.connectedDevices, 'device') + ' connected' : null,
    t.outboundLastHour != null ? `${t.outboundLastHour.toLocaleString()} IPTV requests last hour` : `${t.portalRequests.toLocaleString()} IPTV requests`,
    t.portalErrors ? `${t.portalErrors.toLocaleString()} failed` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-10">
      {/* Health: one line */}
      <section className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="flex items-center gap-2 font-semibold text-white">
          <span className={`h-2.5 w-2.5 rounded-full ${allGood ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          {allGood ? 'All good' : 'Something needs a look'}
        </span>
        <span className="text-gray-400">IPTV {data.health.iptv === 'online' ? 'online' : 'offline'}</span>
        <span className="text-gray-500">Up {uptime(data.health.uptimeSeconds)}</span>
        <span className="text-gray-500">{data.health.memoryMb} MB memory</span>
        {data.runningJobs.length > 0 && <span className="text-gray-500">Working on: {data.runningJobs.join(', ')}</span>}
      </section>

      {/* Needs you: only when there is something */}
      {needs.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-400">Needs you</h2>
          <ul className="divide-y divide-white/5 overflow-hidden rounded-xl bg-white/[0.03]">
            {needs.map((x) => (
              <li key={x.text}>
                <button
                  type="button"
                  data-focusable="true"
                  onClick={() => onOpen(x.target)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-200 transition-colors hover:bg-white/5 focus:bg-white/5 focus:outline-hidden"
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${x.urgent ? 'bg-red-400' : 'bg-amber-400'}`} />
                  <span className="flex-1">{x.text}</span>
                  <ChevronRight size={16} className="text-gray-600" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Watching now */}
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-gray-400">Watching now</h2>
          <button type="button" data-focusable="true" onClick={() => onOpen({ section: 'iptv', page: 'activity' })} className="text-xs text-gray-500 hover:text-gray-300">
            Activity →
          </button>
        </div>
        {data.watching.length === 0 ? (
          <p className="text-sm text-gray-600">Nobody right now.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {data.watching.map((w, i) => (
              <li key={`${w.user}-${w.title}-${i}`} className="flex items-center gap-4 py-2.5 text-sm">
                <span className="w-32 shrink-0 truncate font-medium text-gray-200">{w.user ?? 'Unknown'}</span>
                <span className="min-w-0 flex-1 truncate text-gray-300" title={w.category ?? undefined}>
                  {w.title ?? 'Something'}
                  {w.kind && <span className="ml-2 text-xs text-gray-600">{KIND_LABEL[w.kind] ?? w.kind}</span>}
                </span>
                <span className="shrink-0 tabular-nums text-gray-500">{formatDuration(Date.now() - w.startedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Today: one quiet line */}
      <section className="text-sm text-gray-500">
        <span className="mr-3 font-semibold text-gray-400">Today</span>
        {today.join('  ·  ')}
      </section>
    </div>
  );
};

export default AdminOverview;
