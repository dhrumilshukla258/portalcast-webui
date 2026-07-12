import type { User } from '@/api/types/user';

export type { User };

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export type LoginClientType = 'tv' | 'web';
