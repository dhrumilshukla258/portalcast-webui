import { useSyncExternalStore } from 'react';
import { api, onApiHeaders } from '@/api/client';

// Offline mode: whether the server can reach the IPTV portal. While it cannot, IPTV cards
// are dimmed and a banner says so; local-library titles stay bright and keep playing.
// Every server answer carries the status (X-IPTV header), so while the app is in use it
// needs no request of its own; GET /api/v2/health/iptv is asked only after 5 minutes
// without any answer (was every minute). Older servers (no header, no endpoint) count as online.

const QUIET_MS = 5 * 60_000;
let offline = false;
let started = false;
let lastHeardAt = 0;
const listeners = new Set<() => void>();

function set(next: boolean) {
  if (next !== offline) {
    offline = next;
    listeners.forEach((l) => l());
  }
}

onApiHeaders((headers) => {
  const v = headers.get('x-iptv');
  if (!v) return;
  lastHeardAt = Date.now();
  set(v === 'offline');
});

async function poll() {
  if (Date.now() - lastHeardAt < QUIET_MS) return; // recent answers already told us
  try {
    const r = await api.get<{ iptv: string }>('/v2/health/iptv');
    set(r.data?.iptv === 'offline');
  } catch {
    set(false);
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
