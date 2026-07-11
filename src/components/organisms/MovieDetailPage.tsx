import React from 'react';
import { ArrowLeft } from 'lucide-react';
import type { MediaItem } from '@/types';
import { MediaInfoHeader } from '@/components/organisms/MediaInfoHeader';

interface MovieDetailPageProps {
  item: MediaItem;
  onPlay: (item: MediaItem) => void;
  onBack: () => void;
}

const MovieDetailPage: React.FC<MovieDetailPageProps> = ({ item, onPlay, onBack }) => {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <button
        onClick={onBack}
        data-focusable="true"
        aria-label="Back"
        className="flex w-fit shrink-0 items-center gap-2 rounded-full border border-gray-800/80 bg-gray-900/40 px-3 py-2 text-sm font-bold text-gray-300 transition-colors hover:bg-gray-800/60 hover:text-white"
      >
        <ArrowLeft size={16} />
        <span>Back</span>
      </button>
      <MediaInfoHeader item={item} onPlay={() => onPlay(item)} playLabel="Play Movie" />
    </div>
  );
};

export default MovieDetailPage;
