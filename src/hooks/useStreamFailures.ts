import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  getStreamFailures,
  testStreamFailure,
  unhideStreamFailure,
  dismissStreamFailure,
} from '@/api/endpoints/admin';
import type { StreamFailure, StreamFailureStatus } from '@/api/types/admin';

export interface TestOutcome {
  ok: boolean;
  status: number | null;
  error?: string;
  at: number;
}

// Owns the "Broken streams" admin tab state: the filtered list, per-row busy
// flags and the last inline Test result per row. Uses the same request-
// sequence guard as useContentManager so a slow response for a previous
// filter can never overwrite the list for the current one.
export function useStreamFailures() {
  const [status, setStatus] = useState<StreamFailureStatus>('active');
  const [items, setItems] = useState<StreamFailure[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<number, 'test' | 'unhide' | 'dismiss' | undefined>>({});
  const [testResults, setTestResults] = useState<Record<number, TestOutcome>>({});
  const requestRef = useRef(0);

  const load = useCallback(async (which: StreamFailureStatus) => {
    const seq = ++requestRef.current;
    setLoading(true);
    try {
      const res = await getStreamFailures(which);
      if (seq === requestRef.current) setItems(res.items);
    } catch (err) {
      if (seq === requestRef.current) {
        console.error(err);
        toast.error('Failed to load broken streams.');
      }
    } finally {
      if (seq === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(status);
  }, [status, load]);

  const replaceRow = (row: StreamFailure) =>
    setItems((prev) => prev.map((r) => (r.id === row.id ? row : r)));

  const setRowBusy = (id: number, action?: 'test' | 'unhide' | 'dismiss') =>
    setBusy((prev) => ({ ...prev, [id]: action }));

  const test = async (id: number) => {
    setRowBusy(id, 'test');
    try {
      const res = await testStreamFailure(id);
      setTestResults((prev) => ({
        ...prev,
        [id]: { ok: res.ok, status: res.status, error: res.error, at: Date.now() },
      }));
      replaceRow(res.item);
    } catch (err) {
      console.error(err);
      setTestResults((prev) => ({
        ...prev,
        [id]: { ok: false, status: null, error: 'Test request failed', at: Date.now() },
      }));
    } finally {
      setRowBusy(id);
    }
  };

  const unhide = async (id: number) => {
    setRowBusy(id, 'unhide');
    try {
      const row = await unhideStreamFailure(id);
      toast.success(`"${row.title ?? row.itemId}" is visible again.`);
      if (status === 'hidden') setItems((prev) => prev.filter((r) => r.id !== id));
      else replaceRow(row);
    } catch (err) {
      console.error(err);
      toast.error('Failed to unhide.');
    } finally {
      setRowBusy(id);
    }
  };

  const dismiss = async (id: number) => {
    setRowBusy(id, 'dismiss');
    try {
      const row = await dismissStreamFailure(id);
      if (status === 'all') replaceRow(row);
      else setItems((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
      toast.error('Failed to dismiss.');
    } finally {
      setRowBusy(id);
    }
  };

  return {
    status,
    setStatus,
    items,
    loading,
    busy,
    testResults,
    refresh: () => load(status),
    test,
    unhide,
    dismiss,
  };
}

export function formatAgo(iso: string | null): string {
  if (!iso) return '—';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
