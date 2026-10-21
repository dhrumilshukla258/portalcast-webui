import { api } from '@/api/client';
import type {
  Config,
  UserRecord,
  CreateUserPayload,
  UpdateUserPayload,
  ContentType,
  Category,
  Item,
  ReorderPayload,
  UpdateCategoryPayload,
  UpdateItemPayload,
  StreamFailure,
  StreamFailureList,
  StreamFailureStatus,
  StreamFailureTestResult,
  SecurityEventRow,
  SecuritySummary,
  SettingsResponse,
  BackgroundJob,
  LibrariesResponse,
  LocalLibrary,
  FolderListing,
  LibraryTitle,
  TmdbCandidate,
} from '@/api/types/admin';

// --- Server config ---

export const getConfig = async (signal?: AbortSignal): Promise<Partial<Config>> =>
  (await api.get<Partial<Config>>('/config', { signal })).data;

export const saveConfig = async (
  config: Partial<Config>
): Promise<{ message?: string }> =>
  (await api.post<{ message?: string }>('/config', config)).data;

export const refreshGroups = async (): Promise<void> => {
  await api.get('/v2/refresh-groups');
};

export const refreshChannels = async (): Promise<void> => {
  await api.get('/v2/refresh-channels');
};

export const refreshMovieGroups = async (): Promise<void> => {
  await api.get('/v2/refresh-movie-groups');
};

export const refreshSeriesGroups = async (): Promise<void> => {
  await api.get('/v2/refresh-series-groups');
};

export const clearServerCache = async (): Promise<void> => {
  await api.post('/clear-cache');
};

// --- User management ---

export const getUsers = async (): Promise<UserRecord[]> =>
  (await api.get<UserRecord[]>('/admin/users')).data;

export const createUser = async (
  payload: CreateUserPayload
): Promise<UserRecord> => (await api.post<UserRecord>('/admin/users', payload)).data;

export const updateUser = async (
  userId: number,
  payload: UpdateUserPayload
): Promise<UserRecord> =>
  (await api.put<UserRecord>(`/admin/users/${userId}`, payload)).data;

export const deleteUser = async (userId: number): Promise<void> => {
  await api.delete(`/admin/users/${userId}`);
};

// --- Content manager (genres / items) ---

export const getGenres = async (type: ContentType): Promise<Category[]> =>
  (await api.get<Category[]>('/admin/genres', { params: { type } })).data;

export const getGenreItems = async (
  type: ContentType,
  categoryId: string
): Promise<Item[]> =>
  (
    await api.get<Item[]>('/admin/items', {
      params: { type, category_id: categoryId },
    })
  ).data;

export const updateGenre = async (
  type: ContentType,
  categoryId: string,
  payload: UpdateCategoryPayload
): Promise<void> => {
  await api.put(`/admin/genres/${type}/${categoryId}`, payload);
};

export const deleteGenre = async (
  type: ContentType,
  categoryId: string
): Promise<void> => {
  await api.delete(`/admin/genres/${type}/${categoryId}`);
};

export const createGenre = async (
  type: ContentType,
  title: string
): Promise<void> => {
  await api.post(`/admin/genres/${type}`, { title });
};

export const reorderGenres = async (
  type: ContentType,
  payload: ReorderPayload
): Promise<void> => {
  await api.put(`/admin/genres/${type}/reorder`, payload);
};

export const resetGenreOrder = async (type: ContentType): Promise<void> => {
  await api.delete(`/admin/genres/${type}/order`);
};

export const updateGenreItem = async (
  type: ContentType,
  itemId: string,
  payload: UpdateItemPayload
): Promise<void> => {
  await api.put(`/admin/items/${type}/${itemId}`, payload);
};

export const deleteGenreItem = async (
  type: ContentType,
  itemId: string
): Promise<void> => {
  await api.delete(`/admin/items/${type}/${itemId}`);
};

export const reorderGenreItems = async (
  type: ContentType,
  categoryId: string,
  payload: ReorderPayload
): Promise<void> => {
  await api.put(`/admin/items/${type}/${categoryId}/reorder`, payload);
};

// --- Broken streams ---

export const getStreamFailures = async (
  status: StreamFailureStatus,
  signal?: AbortSignal
): Promise<StreamFailureList> =>
  (await api.get<StreamFailureList>('/admin/stream-failures', { params: { status }, signal })).data;

export const testStreamFailure = async (id: number): Promise<StreamFailureTestResult> =>
  (await api.post<StreamFailureTestResult>(`/admin/stream-failures/${id}/test`)).data;

export const unhideStreamFailure = async (id: number): Promise<StreamFailure> =>
  (await api.post<{ success: boolean; item: StreamFailure }>(`/admin/stream-failures/${id}/unhide`)).data.item;

export const dismissStreamFailure = async (id: number): Promise<StreamFailure> =>
  (await api.delete<{ success: boolean; item: StreamFailure }>(`/admin/stream-failures/${id}`)).data.item;

// ---- Security ----
export const getSecuritySummary = async (hours = 24): Promise<SecuritySummary> =>
  (await api.get<SecuritySummary>('/admin/security/summary', { params: { hours } })).data!;

export const getSecurityEvents = async (params: { kind?: string; ip?: string; hours?: number; limit?: number }): Promise<SecurityEventRow[]> =>
  (await api.get<{ items: SecurityEventRow[] }>('/admin/security/events', { params })).data?.items ?? [];

export const banIp = async (ip: string, minutes = 60): Promise<void> => {
  await api.post('/admin/security/bans', { ip, minutes });
};

export const unbanIp = async (ip: string): Promise<void> => {
  await api.delete(`/admin/security/bans/${encodeURIComponent(ip)}`);
};

// ---- Settings ----
export const getSettings = async (): Promise<SettingsResponse> =>
  (await api.get<SettingsResponse>('/admin/settings')).data!;

export const saveSetting = async (key: string, value: unknown): Promise<SettingsResponse> =>
  (await api.put<SettingsResponse>(`/admin/settings/${encodeURIComponent(key)}`, { value })).data!;

export const resetSetting = async (key: string): Promise<SettingsResponse> =>
  (await api.delete<SettingsResponse>(`/admin/settings/${encodeURIComponent(key)}`)).data!;

export const sendTestEmail = async (to?: string): Promise<{ ok: boolean; to: string }> =>
  (await api.post<{ ok: boolean; to: string }>('/admin/settings/test-email', { to })).data!;

// ---- Background jobs ----
export const getJobs = async (): Promise<BackgroundJob[]> =>
  (await api.get<{ items: BackgroundJob[] }>('/admin/jobs')).data?.items ?? [];

export const runJob = async (name: string): Promise<{ started: boolean; items: BackgroundJob[] }> =>
  (await api.post<{ started: boolean; items: BackgroundJob[] }>(`/admin/jobs/${encodeURIComponent(name)}/run`)).data!;

// ---- Local libraries ----
export const getLibraries = async (): Promise<LibrariesResponse> =>
  (await api.get<LibrariesResponse>('/admin/libraries')).data!;

export const createLibrary = async (name: string, folders: string[], kind: 'movies' | 'series' = 'movies'): Promise<LocalLibrary> =>
  (await api.post<LocalLibrary>('/admin/libraries', { name, folders, kind })).data!;

export const updateLibrary = async (id: number, patch: { name?: string; folders?: string[]; enabled?: boolean }): Promise<LocalLibrary> =>
  (await api.put<LocalLibrary>(`/admin/libraries/${id}`, patch)).data!;

export const deleteLibrary = async (id: number): Promise<void> => {
  await api.delete(`/admin/libraries/${id}`);
};

export const scanLibrary = async (id: number | 'all'): Promise<{ started: boolean; scanning: boolean }> =>
  (await api.post<{ started: boolean; scanning: boolean }>(`/admin/libraries/${id}/scan`)).data!;

export const browseFolders = async (path?: string): Promise<FolderListing> =>
  (await api.get<FolderListing>('/admin/libraries/browse', { params: path ? { path } : {} })).data!;

export const getLibraryTitles = async (id: number, filter: 'all' | 'unmatched' | 'missing', q = ''): Promise<LibraryTitle[]> =>
  (await api.get<{ items: LibraryTitle[] }>(`/admin/libraries/${id}/items`, { params: { filter, q } })).data?.items ?? [];

export const searchMatches = async (q: string, year?: string | null, kind: 'movie' | 'series' = 'movie'): Promise<TmdbCandidate[]> =>
  (await api.get<{ items: TmdbCandidate[] }>('/admin/libraries/match-search', { params: { q, year: year || undefined, kind } })).data?.items ?? [];

export const setTitleMatch = async (itemId: number, tmdbId: number | null): Promise<void> => {
  await api.post(`/admin/libraries/items/${itemId}/match`, { tmdbId });
};

// ---- Overview (Admin front page) ----
export interface AdminOverview {
  health: { iptv: 'online' | 'offline'; iptvSince: string; uptimeSeconds: number; memoryMb: number };
  needs: {
    pendingUsers: number;
    brokenStreams: number;
    securityAlerts: number;
    unmatchedLocal: number;
    missingLocal: number;
    failedJobs: { name: string; label: string; error: string | null }[];
    iptvOffline: boolean;
  };
  watching: { user: string | null; title: string | null; kind: string | null; category: string | null; startedAt: number }[];
  runningJobs: string[];
  today: {
    activeUsers: number;
    connectedDevices: number;
    portalRequests: number;
    portalErrors: number;
    portalSince: string;
    outboundLastHour: number | null;
  };
}

/** Everything the Overview shows, one request (server caches its counts for 15 s). */
export const getOverview = async (signal?: AbortSignal): Promise<AdminOverview> =>
  (await api.get<AdminOverview>('/admin/overview', { signal })).data!;
