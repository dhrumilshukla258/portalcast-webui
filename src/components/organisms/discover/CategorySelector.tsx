import React, { useRef } from 'react';
import type { ChannelGroup } from '@/types';
import { DraggableCategoryList } from '@/components/organisms/admin/DraggableCategoryList';
import { useCategorySelector } from '@/hooks/useCategorySelector';
import CategoryPinOverlay from './category-selector/CategoryPinOverlay';

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
          <h2 className="text-sm font-black uppercase tracking-tight text-white/80 drop-shadow-md">
            Categories
          </h2>
          <button
            onClick={() => setShowAllOverlay(true)}
            data-focusable="true"
            title="Pin / Manage Categories"
            className="rounded-full p-1.5 text-gray-400 transition-all hover:bg-white/10 hover:text-white"
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
              <button
                key={cat.id || idx}
                data-focusable="true"
                data-selected={isActive ? 'true' : 'false'}
                onClick={() => handleSelect(cat.id, cat.title)}
                className={`flex h-8 shrink-0 items-center justify-center rounded-full px-4 text-center outline-hidden text-xs sm:text-sm ${
                  isActive
                    ? 'border-transparent bg-linear-to-r from-sky-400 via-blue-500 to-blue-600 text-white font-extrabold shadow-lg shadow-blue-500/30'
                    : 'border-gray-800/80 bg-gray-900/30 text-gray-400 font-bold hover:border-gray-750 hover:text-gray-200'
                } focus:scale-105 focus:border-transparent focus:text-white focus:bg-linear-to-r focus:from-sky-400 focus:to-blue-500 focus:shadow-[0_0_20px_rgba(56,189,248,0.4)] [&.focused]:scale-105 [&.focused]:border-transparent! [&.focused]:text-white [&.focused]:bg-linear-to-r [&.focused]:from-sky-400 [&.focused]:to-blue-500 [&.focused]:shadow-[0_0_20px_rgba(56,189,248,0.4)]`}
              >
                <span className="font-bold whitespace-nowrap">
                  {cat.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Pin / Manage Toggle Button */}
        <button
          onClick={() => setShowAllOverlay(true)}
          data-focusable="true"
          title="Add / Pin Categories"
          className="h-12 w-12 shrink-0 flex items-center justify-center rounded-full border border-gray-800/80 bg-gray-900/30 text-gray-400 font-bold hover:border-gray-750 hover:text-gray-200 hover:bg-gray-800/40 focus:scale-105 focus:border-blue-500 focus:text-white focus:shadow-[0_0_15px_rgba(56,189,248,0.3)] transition-all cursor-pointer"
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
