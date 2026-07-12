// Public SDK surface for portalcast-webui's networking layer. Native client ports
// should be able to depend on `endpoints/` + `types/` alone.

export * from '@/api/client';
export * from '@/api/config';
export * from '@/api/platform';

export * from '@/api/endpoints/channels';
export * from '@/api/endpoints/movies';
export * from '@/api/endpoints/series';
export * from '@/api/endpoints/epg';
export * from '@/api/endpoints/carousel';
export * from '@/api/endpoints/downloads';
export * from '@/api/endpoints/user';
export * from '@/api/endpoints/auth';
export * from '@/api/endpoints/subtitles';
export * from '@/api/endpoints/admin';
export * from '@/api/endpoints/profiles';

export type { PaginatedResponse } from '@/api/types/channels';
export type { CarouselSlide } from '@/api/types/carousel';
export type { ProgressRecord, User } from '@/api/types/user';
export type { AuthResponse, LoginClientType } from '@/api/types/auth';
export type {
  Config,
  UserRecord,
  ContentType,
  Category,
  Item,
} from '@/api/types/admin';
export type { ConfigProfile } from '@/api/types/profiles';
