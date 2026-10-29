import React from 'react';
import type { MediaItem } from '@/types';
import { MediaInfoHeader } from '@/components/organisms/video/MediaInfoHeader';

interface MovieDetailPageProps {
  item: MediaItem;
  onPlay: (item: MediaItem) => void;
  onBack: () => void;
}

const MovieDetailPage: React.FC<MovieDetailPageProps> = ({ item, onPlay }) => {
  return (
    <div className="w-full">
      <MediaInfoHeader item={item} onPlay={() => onPlay(item)} playLabel="Play Movie" />
    </div>
  );
};

export default MovieDetailPage;
