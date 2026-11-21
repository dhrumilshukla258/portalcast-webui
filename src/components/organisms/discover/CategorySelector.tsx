import React, { useRef } from 'react';
import type { ChannelGroup } from '@/types';
import { DraggableCategoryList } from '@/components/organisms/admin/DraggableCategoryList';
import { useCategorySelector } from '@/hooks/useCategorySelector';
import CategoryPinOverlay from './category-selector/CategoryPinOverlay';
import Chip from '@/components/ui/Chip';

interface CategorySelectorProps {
  categories: ChannelGroup[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string, categoryTitle: string) => void;
  contentType: 'movie' | 'series';
  providerKey: string;
  showAllOverlay: boolean;
  setShowAllOverlay: (show: boolean) => void;
  layout?: 'bar' | 'sidebar';
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  contentType,
  providerKey,
  showAllOverlay,
  setShowAllOverlay,
  layout = 'bar',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const {
    searchQuery,
    setSearchQuery,
    pinnedIds,
    outsideCategories,
    filteredCategories,
    handleReorder,
    handleTogglePin,
    handleSelect,
    handleClearAllPins,
  } = useCategorySelector(categories, contentType, providerKey, onSelectCategory, setShowAllOverlay);

  if (!categories || categories.length <= 1) return null;

  const overlayModal = (
    <CategoryPinOverlay
      show={showAllOverlay}
      onClose={() => {
        setShowAllOverlay(false);
        setSearchQuery('');
      }}
      filteredCategories={filteredCategories}
      selectedCategory={selectedCategory}
      pinnedIds={pinnedIds}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      handleSelect={handleSelect}
      handleTogglePin={handleTogglePin}
      handleClearAllPins={handleClearAllPins}
    />
  );

  if (layout === 'sidebar') {
    return (
      <div className="flex h-full w-full flex-col">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="ui-label text-sm font-black drop-shadow-md">
            Categories
          </h2>
          <button
            onClick={() => setShowAllOverlay(true)}
            data-focusable="true"
            title="Pin / Manage Categories"
            className="rounded-full p-1.5 text-fg-muted transition-all hover:bg-interaction hover:text-fg"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <div
          ref={scrollContainerRef}
          data-focus-group="categories"
          className="custom-scrollbar flex-1 overflow-y-auto pr-1"
        >
          <DraggableCategoryList
            items={outsideCategories}
            selectedCategory={selectedCategory}
            onSelect={handleSelect}
            onReorder={handleReorder}
          />
        </div>

        {overlayModal}
      </div>
    );
  }

  return (
    <div className="mb-4 px-2 sm:px-0">
      <div className="flex items-center gap-3">
        <div
          ref={scrollContainerRef}
          data-focus-group="categories"
          // overflow-y-hidden pairs with overflow-x-auto deliberately — see
          // MediaCardRow's identical fix for why (browser silently promotes
          // overflow-y to auto otherwise, and a hovered/focused pill's
          // scale-105 can then eat wheel-down scroll into an invisible
          // vertical sliver instead of bubbling to the page).
          className="hide-scrollbar grow flex gap-2 overflow-x-auto overflow-y-hidden px-3 py-2 scroll-smooth"
        >
          {outsideCategories.map((cat, idx) => {
            const isActive = selectedCategory === cat.id;

            return (
              <Chip
                key={cat.id || idx}
                selected={isActive}
                data-selected={isActive ? 'true' : 'false'}
                onClick={() => handleSelect(cat.id, cat.title)}
              >
                {cat.title}
              </Chip>
            );
          })}
        </div>

        {/* Pin / Manage Toggle Button */}
        <button
          onClick={() => setShowAllOverlay(true)}
          data-focusable="true"
          title="Add / Pin Categories"
          className="h-12 w-12 shrink-0 flex items-center justify-center rounded-full border border-divider/80 bg-panel/30 text-fg-muted font-bold hover:border-line hover:text-fg-soft hover:bg-panel-hover/40 focus:scale-105 focus:border-focus focus:text-fg transition-all cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {overlayModal}
    </div>
  );
};
