import React from 'react';
import MediaCardRow from '@/components/organisms/browse/MediaCardRow';
import type { MediaItem } from '@/types';

interface RecommendedRowProps {
  onClick: (item: MediaItem) => void;
  // Sourced from useDiscover's centrally-fetched recommendations — same reasoning as
  // ContinueWatching's progressRecords prop: fetching independently inside this row
  // would pop in late after the surrounding page has already rendered.
  items: MediaItem[];
  loading: boolean;
  // The single most-recently-watched title driving these recommendations —
  // null until the backend resolves it (e.g. no watch history yet).
  basedOnTitle?: string | null;
  loadingItemId?: string | null;
}

const RecommendedRow: React.FC<RecommendedRowProps> = ({ onClick, items, loading, basedOnTitle, loadingItemId }) => (
  <MediaCardRow
    title={basedOnTitle ? `Because You Watched ${basedOnTitle}` : 'Because You Watched'}
    onClick={onClick}
    items={items}
    loading={loading}
    loadingItemId={loadingItemId}
  />
);

export default RecommendedRow;
