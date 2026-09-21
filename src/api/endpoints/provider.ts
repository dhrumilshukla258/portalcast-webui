import { api } from '@/api/client';

// Identifier for the active portal provider ("{type}_{host}"). Readable by any
// logged-in user, unlike `getConfig()` (admin-only, returns the full config).
export const getProviderKey = async (): Promise<string> =>
  (await api.get<{ providerKey: string }>('/v2/provider-key')).data.providerKey;
