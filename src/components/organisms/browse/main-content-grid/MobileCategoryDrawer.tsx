import { CategorySelector } from '@/components/organisms/discover/CategorySelector';
import type { ChannelGroup } from '@/types';

interface MobileCategoryDrawerProps {
  vodCategories: ChannelGroup[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string, categoryTitle: string) => void;
  contentType: 'movie' | 'series';
  providerKey: string;
  isCategoriesOpen: boolean;
  setIsCategoriesOpen: (open: boolean) => void;
  onClose: () => void;
}

const MobileCategoryDrawer: React.FC<MobileCategoryDrawerProps> = ({
  vodCategories,
  selectedCategory,
  onSelectCategory,
  contentType,
  providerKey,
  isCategoriesOpen,
  setIsCategoriesOpen,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
      <div className="absolute inset-0 bg-black/85" onClick={onClose} />
      <div className="animate-in slide-in-from-left relative flex h-full w-[78vw] max-w-xs flex-col border-r border-white/10 bg-black/90 p-3 shadow-2xl duration-200">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-xs font-black uppercase tracking-tight text-white/60">
            Browse
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <CategorySelector
          categories={vodCategories}
          selectedCategory={selectedCategory}
          onSelectCategory={(id, title) => {
            onSelectCategory(id, title);
            onClose();
          }}
          contentType={contentType}
          providerKey={providerKey}
          showAllOverlay={isCategoriesOpen}
          setShowAllOverlay={setIsCategoriesOpen}
          layout="sidebar"
        />
      </div>
    </div>
  );
};

export default MobileCategoryDrawer;
