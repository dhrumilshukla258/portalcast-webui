import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '@/context/useSocket';
import { useAuth } from '@/context/AuthContext';

const LogsTab: React.FC = () => {
  const { socket } = useSocket();
  const { token } = useAuth();
  const [serverLogs, setServerLogs] = useState<
    { level: string; message: string; timestamp: string }[]
  >([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket || !token) return;

    const handleLog = (log: {
      level: string;
      message: string;
      timestamp: string;
    }) => {
      setServerLogs((prev) => {
        const newLogs = [...prev, log];
        if (newLogs.length > 1000) return newLogs.slice(-1000);
        return newLogs;
      });
    };

    // Server now requires the admin JWT in the join payload — without it the
    // join is silently ignored (fail-closed, no error emitted back).
    socket.emit('start_logging', { token });
    socket.on('server_log', handleLog);

    return () => {
      socket.emit('stop_logging');
      socket.off('server_log', handleLog);
    };
  }, [socket, token]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [serverLogs, autoScroll]);

  return (
    <div className="animate-in fade-in zoom-in-95 space-y-4 duration-300">
      <div className="flex items-center justify-between rounded-xl bg-white/[0.03] p-4 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          <h3 className="font-bold text-fg">Live System Logs</h3>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-fg-muted">
            Auto-scroll
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded-sm border-line-strong bg-panel-raised text-accent focus:ring-offset-0"
            />
          </label>
          <button
            onClick={() => setServerLogs([])}
            className="rounded-lg bg-panel-raised px-3 py-1.5 text-xs font-bold transition-colors hover:bg-panel-hover"
          >
            Clear Terminal
          </button>
        </div>
      </div>
      <div className="custom-scrollbar h-[600px] overflow-y-auto rounded-2xl border border-line bg-surface-1 p-6 font-mono text-2xs leading-relaxed shadow-2xl">
        {serverLogs.length === 0 ? (
          <div className="flex h-full items-center justify-center italic text-fg-subtle">
            No incoming logs...
          </div>
        ) : (
          serverLogs.map((log, i) => (
            <div
              key={i}
              className="group mb-1 flex gap-4 opacity-80 hover:opacity-100"
            >
              <span className="text-fg-subtle">
                [{new Date(log.timestamp).toLocaleTimeString()}]
              </span>
              <span
                className={`font-bold uppercase ${log.level === 'error' || log.level === 'fatal' ? 'text-red-500' : log.level === 'warn' ? 'text-yellow-500' : 'text-accent'}`}
              >
                {log.level}
              </span>
              <span className="break-all text-fg-soft">
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
};

export default LogsTab;
