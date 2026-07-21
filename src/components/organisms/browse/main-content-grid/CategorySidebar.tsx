import { CategorySelector } from '@/components/organisms/discover/CategorySelector';
import type { ChannelGroup } from '@/types';

interface CategorySidebarProps {
  sidebarWidth: number;
  onSidebarResizeStart: (e: React.MouseEvent) => void;
  vodCategories: ChannelGroup[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string, categoryTitle: string) => void;
  contentType: 'movie' | 'series';
  providerKey: string;
  isCategoriesOpen: boolean;
  setIsCategoriesOpen: (open: boolean) => void;
}

const CategorySidebar: React.FC<CategorySidebarProps> = ({
  sidebarWidth,
  onSidebarResizeStart,
  vodCategories,
  selectedCategory,
  onSelectCategory,
  contentType,
  providerKey,
  isCategoriesOpen,
  setIsCategoriesOpen,
}) => {
  return (
    <>
      {/* Category sidebar (desktop) — scrolls independently, doesn't move with content */}
      <div
        style={{ width: sidebarWidth }}
        className="custom-scrollbar hidden shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-black/70 p-3 md:flex"
      >
        <CategorySelector
          categories={vodCategories}
          selectedCategory={selectedCategory}
          onSelectCategory={onSelectCategory}
          contentType={contentType}
          providerKey={providerKey}
          showAllOverlay={isCategoriesOpen}
          setShowAllOverlay={setIsCategoriesOpen}
          layout="sidebar"
        />
      </div>

      {/* Drag handle to resize the sidebar */}
      <div
        onMouseDown={onSidebarResizeStart}
        title="Drag to resize categories panel"
        className="group hidden w-3 shrink-0 cursor-col-resize items-center justify-center bg-black/70 md:flex"
      >
        <div className="h-16 w-1 rounded-full bg-gray-700/60 transition-colors group-hover:bg-blue-500" />
      </div>
    </>
  );
};

export default CategorySidebar;
