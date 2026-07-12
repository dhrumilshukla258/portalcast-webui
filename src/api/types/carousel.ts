export interface CarouselSlide {
  id?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  mobileImageUrl?: string;
  tabletImageUrl?: string;
  actionType: 'none' | 'play' | 'details';
  mediaType?: 'movie' | 'series' | 'tv';
  mediaId?: string;
  order: number;
}
