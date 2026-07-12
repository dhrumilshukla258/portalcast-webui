import { api } from '@/api/client';
import { API_PATHS } from '@/api/endpoints/channels';
import type { CarouselSlide } from '@/api/types/carousel';

export type { CarouselSlide };

export const getCarouselSlides = async (
  signal?: AbortSignal
): Promise<CarouselSlide[]> => {
  const response = (await api.get<CarouselSlide[]>(API_PATHS.CAROUSEL, { signal }))
    .data;
  return response || [];
};

export const saveCarouselSlides = async (
  slides: CarouselSlide[]
): Promise<{ success: boolean; message?: string }> => {
  const response = (
    await api.post<{ success: boolean; message?: string }>(
      API_PATHS.CAROUSEL,
      slides
    )
  ).data;
  return response;
};
