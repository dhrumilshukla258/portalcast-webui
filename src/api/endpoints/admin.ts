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
