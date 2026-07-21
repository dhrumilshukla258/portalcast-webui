import type { ChannelGroup } from '@/types';

interface CategoryPinOverlayProps {
  show: boolean;
  onClose: () => void;
  filteredCategories: ChannelGroup[];
  selectedCategory: string | null;
  pinnedIds: string[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  handleSelect: (catId: string, catTitle: string) => void;
  handleTogglePin: (e: React.MouseEvent, catId: string) => void;
  handleClearAllPins: () => void;
}

const CategoryPinOverlay: React.FC<CategoryPinOverlayProps> = ({
  show,
  onClose,
  filteredCategories,
  selectedCategory,
  pinnedIds,
  searchQuery,
  setSearchQuery,
  handleSelect,
  handleTogglePin,
  handleClearAllPins,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200 categories-modal-container">
      <div className="w-full max-w-4xl bg-black/85 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800/60 pb-3">
          <div className="text-left">
            <h4 className="text-lg font-black text-white uppercase tracking-tight">Pin & Select Categories</h4>
            <p className="text-xs text-gray-500">
              Select a category to view it, or check the pin box to pin it outside.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {pinnedIds.length > 0 && (
              <button
                onClick={handleClearAllPins}
                data-focusable="true"
                className="px-3 py-1.5 text-xs rounded-lg bg-red-950/40 border border-red-900/50 text-red-400 hover:bg-red-900/30 hover:text-red-200 transition-all cursor-pointer outline-none focus:border-red-500 [&.focused]:border-red-500"
              >
                Clear All Pins
              </button>
            )}
            <button
              onClick={onClose}
              data-focusable="true"
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-755 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer outline-none focus:bg-gray-700 [&.focused]:bg-gray-700"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search Box */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories..."
            data-focusable="true"
            data-default-focus="true"
            className="w-full bg-gray-950 border border-gray-800 hover:border-gray-750 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 outline-none [&.focused]:border-blue-500 [&.focused]:ring-1 [&.focused]:ring-blue-500"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-gray-500 hover:text-gray-300"
            >
              Clear
            </button>
          )}
        </div>

        {/* Categories Grid (Scrollable) */}
        <div className="flex-grow overflow-y-auto custom-scrollbar pr-1 max-h-[50vh]">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12 text-gray-500 italic">
              No matching categories found.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-0.5">
              {filteredCategories.map((cat, idx) => {
                const isActive = selectedCategory === cat.id;
                const isPinned = pinnedIds.includes(cat.id);
                const isAll = cat.id === '*';

                return (
                  <div
                    key={cat.id || idx}
                    className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-gray-950/40 border-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <button
                      data-focusable="true"
                      onClick={() => handleSelect(cat.id, cat.title)}
                      className={`flex-grow text-left p-2.5 rounded-lg text-xs sm:text-sm font-bold truncate transition-all cursor-pointer outline-none focus:scale-[1.02] focus:bg-gray-800/40 [&.focused]:scale-[1.02] [&.focused]:bg-gray-800/40`}
                    >
                      <span className="truncate">{cat.title}</span>
                    </button>

                    {!isAll && (
                      <button
                        data-focusable="true"
                        onClick={(e) => handleTogglePin(e, cat.id)}
                        title={isPinned ? 'Unpin Category' : 'Pin Category'}
                        className={`p-2 rounded-lg border transition-all shrink-0 ml-1 outline-none ${
                          isPinned
                            ? 'bg-sky-500/20 border-sky-400/50 text-sky-300 hover:bg-sky-500/30'
                            : 'bg-gray-900 border-gray-800 hover:border-gray-700 text-gray-500 hover:text-gray-300'
                        } focus:scale-110 focus:border-sky-400 [&.focused]:scale-110 [&.focused]:border-sky-400`}
                      >
                        {/* Pin Icon */}
                        <svg
                          className="w-4 h-4"
                          fill={isPinned ? 'currentColor' : 'none'}
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                          />
                          <circle cx="12" cy="10.5" r="2.5" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryPinOverlay;
