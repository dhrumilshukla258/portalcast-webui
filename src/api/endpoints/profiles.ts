import { api } from '@/api/client';
import type { ConfigProfile, CreateProfilePayload } from '@/api/types/profiles';

export const getProfiles = async (): Promise<ConfigProfile[]> =>
  (await api.get<ConfigProfile[]>('/profiles')).data;

export const activateProfile = async (profileId: number): Promise<void> => {
  await api.post(`/profiles/${profileId}/activate`);
};

export const setProfileEnabled = async (
  profileId: number,
  enabled: boolean
): Promise<void> => {
  await api.post(`/profiles/${profileId}/${enabled ? 'enable' : 'disable'}`);
};

export const deleteProfile = async (profileId: number): Promise<void> => {
  await api.delete(`/profiles/${profileId}`);
};

export const createProfile = async (
  payload: CreateProfilePayload
): Promise<void> => {
  await api.post('/profiles', payload);
};
