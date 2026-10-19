import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { ShieldAlert, ShieldCheck, RefreshCw } from 'lucide-react';
import { getSecuritySummary, getSecurityEvents, banIp, unbanIp } from '@/api/endpoints/admin';
import type { SecuritySummary, SecurityEventRow } from '@/api/types/admin';
import { formatAgo } from '@/hooks/useStreamFailures';

const KIND_LABEL: Record<string, string> = {
  login_failed: 'Wrong password / unknown account',
  login_disabled: 'Sign-in to a disabled account',
  login_throttled: 'Sign-in rate limit hit',
  google_token_invalid: 'Bad Google token',
  token_invalid: 'Bad or expired access token',
  token_user_disabled: 'Token of a disabled account',
  forbidden: 'Non-admin tried an admin action',
  refresh_invalid: 'Bad refresh token',
  refresh_reuse: 'Stolen refresh token replayed',
  pairing_code_invalid: 'Wrong TV pairing code',
  stream_token_invalid: 'Bad stream token',
  stream_throttled: 'Stream rate limit hit',
  image_proxy_blocked: 'Image proxy aimed at a private address',
  upload_rejected: 'Upload was not an image',
  reset_token_invalid: 'Bad password-reset token',
  suspicious_request: 'Hostile request shape (traversal, injection, scanner)',
  unknown_api_path: 'Probed a route that does not exist',
  ip_banned: 'Address banned',
  ip_unbanned: 'Ban lifted',
};

const SEVERE = new Set(['refresh_reuse', 'image_proxy_blocked', 'forbidden', 'ip_banned', 'suspicious_request']);

/** Admin > Security: suspicious client activity, automatic bans, manual bans. */
const SecurityTab: React.FC = () => {
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [events, setEvents] = useState<SecurityEventRow[]>([]);
  const [kind, setKind] = useState('');
  const [ip, setIp] = useState('');
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(true);
  const [banInput, setBanInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, e] = await Promise.all([
        getSecuritySummary(hours),
        getSecurityEvents({ kind: kind || undefined, ip: ip || undefined, hours, limit: 300 }),
      ]);
      setSummary(s);
      setEvents(e);
    } catch {
      toast.error('Could not load security data (server update required?)');
    } finally {
      setLoading(false);
    }
  }, [hours, kind, ip]);

  useEffect(() => {
    void load();
  }, [load]);

  const doUnban = async (addr: string) => {
    try {
      await unbanIp(addr);
      toast.success(`Ban lifted for ${addr}`);
      void load();
    } catch {
      toast.error('Could not lift the ban');
    }
  };

  const doBan = async () => {
    if (!banInput.trim()) return;
    try {
      await banIp(banInput.trim(), 60);
      toast.success(`${banInput.trim()} banned for 1 hour`);
      setBanInput('');
      void load();
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Could not ban that address');
    }
  };

  const kinds = Object.keys(summary?.byKind ?? {}).sort((a, b) => (summary!.byKind[b] ?? 0) - (summary!.byKind[a] ?? 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-white">
            <ShieldAlert size={18} /> Security
          </h2>
          <p className="text-xs text-slate-400">
            Failed sign-ins, rejected tokens, forbidden requests and other suspicious activity. An address with{' '}
            {summary?.autoBan.afterFailures ?? 20} failures in {summary?.autoBan.windowMinutes ?? 15} minutes is banned for{' '}
            {summary?.autoBan.banMinutes ?? 60} minutes.
            {summary && !summary.autoBan.trustedProxiesConfigured && (
              <span className="ml-1 text-amber-400">
                TRUSTED_PROXIES is not set: behind a reverse proxy every client shares one address, so automatic bans stay off.
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className="rounded bg-slate-800 px-2 py-1 text-sm text-white">
            <option value={1}>Last hour</option>
            <option value={24}>Last 24 h</option>
            <option value={24 * 7}>Last 7 days</option>
            <option value={24 * 30}>Last 30 days</option>
          </select>
          <button onClick={() => void load()} className="rounded bg-slate-700 p-1.5 text-white hover:bg-slate-600" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Events" value={summary?.total ?? '–'} />
        <Stat label="Failed sign-ins" value={summary?.byKind.login_failed ?? 0} />
        <Stat label="Forbidden attempts" value={summary?.byKind.forbidden ?? 0} warn />
        <Stat label="Token replays" value={summary?.byKind.refresh_reuse ?? 0} warn />
      </div>

      {/* Bans */}
      <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Banned addresses</h3>
          <div className="flex items-center gap-1">
            <input value={banInput} onChange={(e) => setBanInput(e.target.value)} placeholder="IP to ban (1 h)"
              className="w-40 rounded bg-slate-800 px-2 py-1 text-xs text-white placeholder-slate-500" />
            <button onClick={() => void doBan()} className="rounded bg-red-700 px-2 py-1 text-xs font-bold text-white hover:bg-red-600">Ban</button>
          </div>
        </div>
        {summary?.bans.length ? (
          <ul className="space-y-1 text-sm">
            {summary.bans.map((b) => (
              <li key={b.ip} className="flex items-center justify-between rounded bg-slate-800/60 px-2 py-1">
                <span className="font-mono text-red-300">{b.ip}</span>
                <span className="text-xs text-slate-400">{b.reason} · until {new Date(b.until).toLocaleTimeString()}</span>
                <button onClick={() => void doUnban(b.ip)} className="text-xs text-blue-400 hover:underline">Lift</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-1 text-xs text-slate-400"><ShieldCheck size={14} /> Nobody is banned.</p>
        )}
      </div>

      {/* Top addresses */}
      {summary?.topIps.length ? (
        <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
          <h3 className="mb-2 text-sm font-bold text-white">Most active addresses</h3>
          <div className="flex flex-wrap gap-2">
            {summary.topIps.map((t) => (
              <button key={t.ip} onClick={() => setIp(ip === t.ip ? '' : t.ip)}
                className={`rounded px-2 py-1 font-mono text-xs ${ip === t.ip ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}>
                {t.ip} <span className="text-slate-400">×{t.count}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Events */}
      <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold text-white">Events</h3>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded bg-slate-800 px-2 py-1 text-xs text-white">
            <option value="">All kinds</option>
            {kinds.map((k) => (
              <option key={k} value={k}>{KIND_LABEL[k] ?? k} ({summary?.byKind[k]})</option>
            ))}
          </select>
          {ip && (
            <button onClick={() => setIp('')} className="rounded bg-slate-800 px-2 py-1 font-mono text-xs text-white">{ip} ✕</button>
          )}
        </div>
        {events.length === 0 ? (
          <p className="text-xs text-slate-400">{loading ? 'Loading…' : 'Nothing recorded for this filter.'}</p>
        ) : (
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-900 text-slate-400">
                <tr>
                  <th className="pb-1 pr-3">When</th>
                  <th className="pb-1 pr-3">What</th>
                  <th className="pb-1 pr-3">Address</th>
                  <th className="pb-1 pr-3">User</th>
                  <th className="pb-1 pr-3">Path</th>
                  <th className="pb-1">Detail</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-t border-slate-800/80 align-top">
                    <td className="py-1 pr-3 whitespace-nowrap text-slate-400" title={e.createdAt}>{formatAgo(e.createdAt)}</td>
                    <td className={`py-1 pr-3 ${SEVERE.has(e.kind) ? 'font-semibold text-red-300' : 'text-slate-200'}`}>{KIND_LABEL[e.kind] ?? e.kind}</td>
                    <td className="py-1 pr-3 font-mono"><button onClick={() => setIp(e.ip)} className="hover:underline">{e.ip}</button></td>
                    <td className="py-1 pr-3 text-slate-400">{e.userId ?? ''}</td>
                    <td className="py-1 pr-3 font-mono text-slate-400">{e.path ?? ''}</td>
                    <td className="py-1 text-slate-400">{e.detail ?? ''}</td>
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

const Stat: React.FC<{ label: string; value: number | string; warn?: boolean }> = ({ label, value, warn }) => (
  <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
    <div className="text-xs text-slate-400">{label}</div>
    <div className={`text-2xl font-black ${warn && Number(value) > 0 ? 'text-red-400' : 'text-white'}`}>{value}</div>
  </div>
);

export default SecurityTab;
