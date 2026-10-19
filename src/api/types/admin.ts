/* eslint-disable @typescript-eslint/no-explicit-any */

// TODO: verify actual server shape
export type Config = {
  hostname: string;
  port: string;
  contextPath: string;
  mac: string;
  deviceId1: string;
  [key: string]: any;
};

export interface UserRecord {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserPayload {
  email: string;
  name: string;
  role: 'admin' | 'user';
  isActive: boolean;
  password?: string;
}

export interface UpdateUserPayload {
  name: string;
  role: 'admin' | 'user';
  isActive: boolean;
  password?: string;
}

export type ContentType = 'channel' | 'movie' | 'series';

export interface Category {
  id: string;
  title: string;
  display_name?: string | null;
  hidden?: boolean;
  count?: number;
}

export interface Item {
  id: string;
  name: string;
  display_name?: string | null;
  hidden?: boolean;
  target_category_id?: string | null;
  original_category_id?: string | null;
}

export interface ReorderPayload {
  order: Array<{ id: string; sort_order: number }>;
}

export interface UpdateCategoryPayload {
  display_name: string | null;
  hidden: boolean;
  virtual_title?: string;
}

export interface UpdateItemPayload {
  display_name: string | null;
  hidden: boolean;
  target_category_id: string | null;
  original_category_id: string | null;
}

// --- Broken streams (/api/admin/stream-failures) ---

export type StreamFailureStatus = 'active' | 'hidden' | 'all';
export type StreamFailureItemType = 'movie' | 'episode' | 'live';

export interface StreamFailure {
  id: number;
  profileId: number;
  itemType: StreamFailureItemType;
  itemId: string;
  title: string | null;
  category: string | null;
  failureCount: number;
  /** Failures that count toward auto-hide (upstream said "not found"). Older servers omit it. */
  strikes?: number;
  /** Attempts before auto-hide (movies only); null when this row never auto-hides. */
  threshold: number | null;
  lastStatus: number | null;
  lastError: string | null;
  /** Host only — the server never exposes the full upstream URL. */
  upstreamHost: string | null;
  hideable: boolean;
  autoHidden: boolean;
  autoHiddenAt: string | null;
  dismissed: boolean;
  firstFailedAt: string | null;
  lastFailedAt: string | null;
}

export interface StreamFailureList {
  status: StreamFailureStatus;
  items: StreamFailure[];
}

export interface StreamFailureTestResult {
  ok: boolean;
  status: number | null;
  error?: string;
  item: StreamFailure;
}

// ---- Admin > Security (servers from 2026-10-19) ----
export interface SecurityEventRow {
  id: number;
  kind: string;
  ip: string;
  userId: number | null;
  path: string | null;
  detail: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface SecuritySummary {
  hours: number;
  total: number;
  byKind: Record<string, number>;
  topIps: { ip: string; count: number }[];
  bans: { ip: string; until: string; reason: string }[];
  autoBan: { enabled: boolean; afterFailures: number; windowMinutes: number; banMinutes: number; trustedProxiesConfigured: boolean };
}
