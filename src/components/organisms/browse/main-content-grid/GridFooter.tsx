import type { MediaItem, ContextType } from '@/types';
import Button from '@/components/ui/Button';

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
        <p className="mt-10 text-center text-fg-muted">No content found.</p>
      )}
      {!items?.length && !loading && context.search && (
        <p className="mt-10 text-center text-fg-muted">
          No results found for "{context.search}".
        </p>
      )}

      {(totalItemsCount === 0 || items.length < totalItemsCount) && contentType !== 'tv' && (
        <div className="w-full py-8 flex flex-col items-center justify-center">
          {loading && items.length > 0 && (
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-accent"></div>
          )}
          {!loading && paginationError && (
            <div className="text-center">
              <p className="text-red-500">{paginationError}</p>
               <Button variant="accent" className="mt-4" onClick={() => handlePageChange(1)}>
                 Retry
               </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default GridFooter;
