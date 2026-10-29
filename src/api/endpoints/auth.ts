import { api } from '@/api/client';
import type { AuthResponse, LoginClientType } from '@/api/types/auth';
import type { User, UpdatePreferencesResponse } from '@/api/types/user';

export const loginWithGoogle = async (
  idToken: string,
  clientType: LoginClientType
): Promise<AuthResponse> =>
  (
    await api.post<AuthResponse>('/auth/google', {
      idToken,
      clientType,
    })
  ).data;

export const loginWithCredentials = async (
  email: string,
  password: string,
  clientType: LoginClientType
): Promise<AuthResponse> =>
  (
    await api.post<AuthResponse>('/auth/login', {
      email,
      password,
      clientType,
    })
  ).data;

/** Sign in with a Jellyfin account (servers from 2026-10-29). */
export const loginWithJellyfin = async (
  username: string,
  password: string,
  clientType: LoginClientType
): Promise<AuthResponse> =>
  (
    await api.post<AuthResponse>('/auth/jellyfin', {
      username,
      password,
      clientType,
    })
  ).data;

export const getUserProfile = async (): Promise<User> =>
  (await api.get<User>('/user/profile')).data;

export const updateUserPreferences = async (
  newPrefs: Partial<User['preferences']>
): Promise<UpdatePreferencesResponse> =>
  (await api.put<UpdatePreferencesResponse>('/user/preferences', newPrefs)).data;

export const syncUserProgress = async (
  mediaId: string,
  progress: number,
  completed: boolean
): Promise<void> => {
  await api.put('/user/progress', { mediaId, progress, completed });
};

/** Revokes this refresh token's session on the server. */
export const logout = async (refreshToken: string): Promise<void> => {
  await api.post('/auth/logout', { refreshToken });
};
