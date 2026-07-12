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
