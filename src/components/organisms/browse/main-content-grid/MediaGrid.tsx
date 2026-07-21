import MediaCard from '@/components/molecules/MediaCard';
import EpisodeCard from '@/components/molecules/EpisodeCard';
import TvChannelListCard from '@/components/molecules/TvChannelListCard';
import type { MediaItem, ContextType } from '@/types';
import type { ProgressRecord } from '@/api/types/user';

interface MediaGridProps {
  items: MediaItem[];
  contentType: 'movie' | 'series' | 'tv';
  isEpisodeList: boolean;
  isTizen: boolean;
  loading: boolean;
  context: ContextType;
  handleItemClick: (item: MediaItem) => void;
  progressByMediaId: Map<string, ProgressRecord>;
  categoryById: Map<string, string>;
}

const MediaGrid: React.FC<MediaGridProps> = ({
  items,
  contentType,
  isEpisodeList,
  isTizen,
  loading,
  context,
  handleItemClick,
  progressByMediaId,
  categoryById,
}) => {
  if (loading && items.length === 0) {
    return (
      <div className="flex w-full justify-center py-12">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div
      className={`${
        contentType === 'tv'
          ? 'channel-list flex flex-col gap-1'
          : isEpisodeList && !isTizen
            ? 'flex flex-col gap-4'
            : isEpisodeList
              ? 'grid grid-cols-1 gap-4 px-2 sm:px-0 md:grid-cols-2'
              : 'grid grid-cols-3 gap-2 px-2 sm:grid-cols-4 sm:gap-4 sm:px-0 md:grid-cols-5 md:gap-6 lg:grid-cols-6 xl:grid-cols-7'
      } ${loading && items.length > 0 && context.page === 1 ? 'pointer-events-none opacity-50 transition-opacity duration-300' : 'opacity-100'}`}
    >
      {items?.map((item, index) =>
        contentType === 'tv' ? (
          <TvChannelListCard
            key={`${item.id}-${index}`}
            item={item}
            onClick={handleItemClick}
            isFocused={false}
          />
        ) : isEpisodeList ? (
          (() => {
            const record = progressByMediaId.get(String(item.id));
            return (
              <EpisodeCard
                key={`${item.id}-${index}`}
                item={item}
                onClick={handleItemClick}
                isCompleted={record?.completed}
              />
            );
          })()
        ) : (
          (() => {
            const record = progressByMediaId.get(String(item.id));
            const categoryLabel = context.search
              ? categoryById.get(String(item.category_id)) || item.genres_str
              : undefined;
            return (
              <MediaCard
                key={`${item.id}-${index}`}
                item={item}
                onClick={handleItemClick}
                isCompleted={record?.completed}
                progressPercent={record?.meta?.progressPercent}
                categoryLabel={categoryLabel}
                highlightTerm={context.search || undefined}
              />
            );
          })()
        )
      )}
    </div>
  );
};

export default MediaGrid;
