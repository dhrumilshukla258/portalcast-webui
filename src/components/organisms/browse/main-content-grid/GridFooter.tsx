import type { MediaItem, ContextType } from '@/types';

interface GridFooterProps {
  items: MediaItem[];
  loading: boolean;
  context: ContextType;
  totalItemsCount: number;
  contentType: 'movie' | 'series' | 'tv';
  paginationError: string | null;
  handlePageChange: (dir: number) => void;
}

const GridFooter: React.FC<GridFooterProps> = ({
  items,
  loading,
  context,
  totalItemsCount,
  contentType,
  paginationError,
  handlePageChange,
}) => {
  return (
    <>
      {!items?.length && !loading && !context.search && (
        <p className="mt-10 text-center text-gray-400">No content found.</p>
      )}
      {!items?.length && !loading && context.search && (
        <p className="mt-10 text-center text-gray-400">
          No results found for "{context.search}".
        </p>
      )}

      {(totalItemsCount === 0 || items.length < totalItemsCount) && contentType !== 'tv' && (
        <div className="w-full py-8 flex flex-col items-center justify-center">
          {loading && items.length > 0 && (
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
          )}
          {!loading && paginationError && (
            <div className="text-center">
              <p className="text-red-500">{paginationError}</p>
              <button
                onClick={() => handlePageChange(1)}
                className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
                data-focusable="true"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default GridFooter;
