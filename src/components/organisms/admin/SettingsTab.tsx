import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { RefreshCw, RotateCcw, Save, Send, Lock, Play } from 'lucide-react';
import { getSettings, saveSetting, resetSetting, sendTestEmail, getJobs, runJob, testJellyfin } from '@/api/endpoints/admin';
import type { ServerSetting, SettingsResponse, BackgroundJob } from '@/api/types/admin';
import { formatAgo } from '@/hooks/useStreamFailures';

const SOURCE_STYLE: Record<ServerSetting['source'], string> = {
  admin: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  environment: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  default: 'bg-gray-700/40 text-gray-400 border-gray-600/40',
};
const SOURCE_LABEL: Record<ServerSetting['source'], string> = {
  admin: 'Saved here',
  environment: 'Environment',
  default: 'Default',
};

const errorText = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;

/** The text an input starts with: secrets start empty (their value never comes back). */
const initialDraft = (s: ServerSetting): string => {
  if (s.secret) return '';
  if (Array.isArray(s.value)) return s.value.join(', ');
  return String(s.value ?? '');
};

const SettingRow: React.FC<{ s: ServerSetting; onSaved: (r: SettingsResponse) => void }> = ({ s, onSaved }) => {
  const [draft, setDraft] = useState(initialDraft(s));
  const [busy, setBusy] = useState(false);

  useEffect(() => setDraft(initialDraft(s)), [s]);

  const dirty = s.secret ? draft.length > 0 : draft !== initialDraft(s);
  const lockedByEnv = s.envWins && s.source === 'environment';

  const save = async (value: unknown) => {
    setBusy(true);
    try {
      onSaved(await saveSetting(s.key, value));
      toast.success(`${s.label} saved`);
    } catch (err) {
      toast.error(errorText(err, `Could not save ${s.label}`));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    try {
      onSaved(await resetSetting(s.key));
      toast.success(`${s.label} reset`);
    } catch (err) {
      toast.error(errorText(err, `Could not reset ${s.label}`));
    } finally {
      setBusy(false);
    }
  };

  const input = (() => {
    const base =
      'w-full rounded-lg border border-gray-700 bg-gray-950/60 px-3 py-2 text-sm text-gray-100 outline-none focus:border-blue-500 disabled:opacity-50';
    if (s.type === 'boolean') {
      const on = Boolean(s.value);
      return (
        <button
          type="button"
          disabled={busy || lockedByEnv}
          onClick={() => void save(!on)}
          className={`relative h-6 w-11 rounded-full transition-colors ${on ? 'bg-blue-600' : 'bg-gray-700'} disabled:opacity-50`}
          aria-pressed={on}
          aria-label={s.label}
          data-focusable="true"
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      );
    }
    if (s.options) {
      return (
        <select value={draft} onChange={(e) => setDraft(e.target.value)} disabled={busy || lockedByEnv} className={base}>
          {s.options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
    }
    return (
      <input
        type={s.secret ? 'password' : s.type === 'number' ? 'number' : 'text'}
        value={draft}
        min={s.min ?? undefined}
        max={s.max ?? undefined}
        autoComplete="off"
        placeholder={s.secret ? (s.isSet ? `${String(s.value)} (type to replace)` : 'Not set') : s.type === 'list' ? 'Comma-separated' : ''}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && dirty) void save(draft);
        }}
        disabled={busy || lockedByEnv}
        className={base}
      />
    );
  })();

  return (
    <div className="grid gap-2 border-t border-gray-800/70 py-4 first:border-t-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-gray-100">{s.label}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${SOURCE_STYLE[s.source]}`}>
            {SOURCE_LABEL[s.source]}
          </span>
          {s.apply === 'restart' && (
            <span className="rounded-full border border-gray-600/50 px-2 py-0.5 text-[11px] text-gray-400">After restart</span>
          )}
        </div>
        {s.help && <p className="mt-1 text-xs leading-relaxed text-gray-500">{s.help}</p>}
        {s.env && <p className="mt-1 font-mono text-[11px] text-gray-600">{s.env}</p>}
        {lockedByEnv && (
          <p className="mt-1 flex items-center gap-1 text-xs text-amber-400/80">
            <Lock size={12} /> Set in the environment, which always wins for this setting.
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">{input}</div>
        {s.type !== 'boolean' && (
          <button
            type="button"
            onClick={() => void save(draft)}
            disabled={!dirty || busy || lockedByEnv}
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
            data-focusable="true"
          >
            <Save size={14} /> Save
          </button>
        )}
        {s.source === 'admin' && (
          <button
            type="button"
            onClick={() => void reset()}
            disabled={busy}
            title="Forget the saved value; the environment or default applies again"
            className="flex items-center gap-1 rounded-lg border border-gray-700 px-3 py-2 text-xs font-bold text-gray-300 hover:bg-gray-800 disabled:opacity-50"
            data-focusable="true"
          >
            <RotateCcw size={14} /> Reset
          </button>
        )}
      </div>
    </div>
  );
};

const TestEmail: React.FC = () => {
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      const r = await sendTestEmail(to.trim() || undefined);
      toast.success(`Test email sent to ${r.to}`);
    } catch (err) {
      toast.error(errorText(err, 'Could not send the test email'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-2 border-t border-gray-800/70 pt-4 sm:flex-row sm:items-center">
      <input
        type="email"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="Send a test to (empty: the admin email)"
        className="w-full rounded-lg border border-gray-700 bg-gray-950/60 px-3 py-2 text-sm text-gray-100 outline-none focus:border-blue-500 sm:max-w-sm"
      />
      <button
        type="button"
        onClick={() => void send()}
        disabled={busy}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-700 px-3 py-2 text-xs font-bold text-gray-200 hover:bg-gray-800 disabled:opacity-50"
        data-focusable="true"
      >
        <Send size={14} /> Send test email
      </button>
    </div>
  );
};

/** Settings › Jellyfin: reaches the server with the saved address and key, and lists what it will read. */
const TestJellyfin: React.FC = () => {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    try {
      const r = await testJellyfin();
      if (!r.ok) {
        setResult(null);
        toast.error(r.error || 'Could not reach Jellyfin');
        return;
      }
      const libs = (r.libraries ?? []).map((l) => `${l.name} (${l.kind === 'series' ? 'shows' : 'movies'})`).join(', ');
      setResult(`Connected to ${r.server}${r.version ? ` ${r.version}` : ''}. ${libs ? `Reads: ${libs}.` : 'It has no movie or show library yet.'}`);
    } catch (err) {
      toast.error(errorText(err, 'Could not test Jellyfin (older server?)'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-2 border-t border-gray-800/70 pt-4 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={() => void run()}
        disabled={busy}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-700 px-3 py-2 text-xs font-bold text-gray-200 hover:bg-gray-800 disabled:opacity-50"
        data-focusable="true"
      >
        {busy ? 'Testing…' : 'Test connection'}
      </button>
      {result && <p className="text-xs text-emerald-300">{result} Its libraries appear in Admin › Libraries.</p>}
    </div>
  );
};

const Jobs: React.FC = () => {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const load = useCallback(async () => {
    try {
      setJobs(await getJobs());
    } catch {
      /* older server: no job list */
    }
  }, []);
  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(t);
  }, [load]);
  if (jobs.length === 0) return null;
  return (
    <section className="rounded-xl bg-white/[0.03] px-5 py-4">
      <h2 className="mb-1 text-base font-black text-white">Background jobs</h2>
      <p className="mb-2 text-xs text-gray-500">
        One at a time. Jobs marked "waits for playback" hold off while someone is watching, for up to 2 hours.
      </p>
      {jobs.map((j) => (
        <div key={j.name} className="flex flex-col gap-2 border-t border-gray-800/70 py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-100">{j.label}</div>
            <div className="text-xs text-gray-500">
              {j.schedule}
              {j.lastEnd ? ` · last run ${formatAgo(j.lastEnd)}` : ' · not run yet'}
            </div>
            {j.lastError ? (
              <div className="mt-1 text-xs text-red-400">{j.lastError}</div>
            ) : j.lastResult ? (
              <div className="mt-1 text-xs text-gray-400">{j.lastResult}</div>
            ) : null}
          </div>
          <button
            type="button"
            disabled={j.running || j.queued}
            onClick={async () => {
              try {
                const r = await runJob(j.name);
                setJobs(r.items);
                toast.info(r.started ? `${j.label}: started` : `${j.label}: already running`);
              } catch (err) {
                toast.error(errorText(err, 'Could not start the job'));
              }
            }}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-700 px-3 py-2 text-xs font-bold text-gray-200 hover:bg-gray-800 disabled:opacity-50"
            data-focusable="true"
          >
            <Play size={14} /> {j.running ? 'Running…' : j.queued ? 'Waiting…' : 'Run now'}
          </button>
        </div>
      ))}
    </section>
  );
};

/** Admin > Settings: every server setting, saved here or taken from the environment. */
const SettingsTab: React.FC = () => {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getSettings());
    } catch {
      toast.error('Could not load settings (server update required?)');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, ServerSetting[]>();
    for (const s of data?.settings ?? []) {
      const list = map.get(s.group) ?? [];
      list.push(s);
      map.set(s.group, list);
    }
    return [...map.entries()];
  }, [data]);

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-gray-400">
          A value saved here wins over the environment variable, which wins over the default. Most changes apply
          immediately; secrets are stored encrypted and never shown in full.
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-2 text-xs font-bold text-gray-300 hover:bg-gray-800"
          data-focusable="true"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {groups.map(([group, items]) => (
        <section key={group} className="rounded-xl bg-white/[0.03] px-5 py-4">
          <h2 className="mb-1 text-base font-black text-white">{group}</h2>
          {items.map((s) => (
            <SettingRow key={s.key} s={s} onSaved={setData} />
          ))}
          {group === 'Email' && <TestEmail />}
          {group === 'Jellyfin' && <TestJellyfin />}
        </section>
      ))}

      <Jobs />

      {data && (
        <section className="rounded-xl bg-white/[0.03] px-5 py-4">
          <h2 className="mb-1 text-base font-black text-white">Set by Docker or the environment</h2>
          <p className="mb-2 text-xs text-gray-500">Read-only here: these are needed before the server can start.</p>
          {data.fixed.map((f) => (
            <div key={f.key} className="grid gap-1 border-t border-gray-800/70 py-3 first:border-t-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-6">
              <div>
                <span className="text-sm font-semibold text-gray-100">{f.label}</span>
                <p className="mt-1 text-xs text-gray-500">{f.help}</p>
              </div>
              <div className="self-center font-mono text-sm text-gray-300">{f.value}</div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

export default SettingsTab;
