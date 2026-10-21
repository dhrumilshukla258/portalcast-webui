import { useSyncExternalStore } from 'react';
import { api } from '@/api/client';

// Offline mode: whether the server can reach the IPTV portal (GET /api/v2/health/iptv,
// servers from 2026-10-21). While it cannot, IPTV cards are dimmed and a banner says so;
// local-library titles stay bright and keep playing. Polled once a minute while the app is
// open; older servers (no endpoint) count as online.

let offline = false;
let started = false;
const listeners = new Set<() => void>();

async function poll() {
  let next = false;
  try {
    const r = await api.get<{ iptv: string }>('/v2/health/iptv');
    next = r.data?.iptv === 'offline';
  } catch {
    next = false;
  }
  if (next !== offline) {
    offline = next;
    listeners.forEach((l) => l());
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    void poll();
    window.setInterval(() => void poll(), 60_000);
  }
  return () => listeners.delete(listener);
}

export function useIptvOffline(): boolean {
  return useSyncExternalStore(subscribe, () => offline, () => false);
}
