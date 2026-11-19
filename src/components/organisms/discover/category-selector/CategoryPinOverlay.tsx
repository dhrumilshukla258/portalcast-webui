import type { ChannelGroup } from '@/types';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import SearchField from '@/components/ui/SearchField';

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
    <Dialog
      dialogRole={false}
      open={show}
      onClose={onClose}
      labelledBy="category-pin-title"
      dismissOnBackdrop={false}
      className="categories-modal-container flex max-h-[85vh] max-w-4xl flex-col space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-divider/60 pb-3">
        <div className="text-left">
          <h4 id="category-pin-title" className="text-lg font-black text-fg uppercase tracking-tight">Pin & Select Categories</h4>
          <p className="text-xs text-fg-subtle">
            Select a category to view it, or check the pin box to pin it outside.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pinnedIds.length > 0 && (
            <Button variant="danger" onClick={handleClearAllPins}>
              Clear All Pins
            </Button>
          )}
          <button
            onClick={onClose}
            data-focusable="true"
            className="p-1.5 rounded-lg bg-panel-raised hover:bg-panel-hover text-fg-muted hover:text-fg-soft transition-colors cursor-pointer outline-hidden focus:bg-panel-hover [&.focused]:bg-panel-hover"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search Box */}
      <SearchField
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onClear={() => setSearchQuery('')}
        placeholder="Search categories..."
        data-default-focus="true"
        autoFocus
      />

      {/* Categories Grid (Scrollable) */}
      <div className="grow overflow-y-auto custom-scrollbar pr-1 max-h-[50vh]">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12 text-fg-subtle italic">
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
                      ? 'bg-accent/20 border-accent text-fg'
                      : 'bg-page/40 border-line text-fg-muted hover:text-fg-soft'
                  }`}
                >
                  <button
                    data-focusable="true"
                    onClick={() => handleSelect(cat.id, cat.title)}
                    className={`grow text-left p-2.5 rounded-lg text-xs sm:text-sm font-bold truncate transition-all cursor-pointer outline-hidden focus:scale-[1.02] focus:bg-panel-hover/40 [&.focused]:scale-[1.02] [&.focused]:bg-panel-hover/40`}
                  >
                    <span className="truncate">{cat.title}</span>
                  </button>

                  {!isAll && (
                    <button
                      data-focusable="true"
                      onClick={(e) => handleTogglePin(e, cat.id)}
                      title={isPinned ? 'Unpin Category' : 'Pin Category'}
                      className={`p-2 rounded-lg border transition-all shrink-0 ml-1 outline-hidden ${
                        isPinned
                          ? 'bg-accent/20 border-accent/50 text-accent hover:bg-accent/30'
                          : 'bg-panel border-line hover:border-line-strong text-fg-subtle hover:text-fg-soft'
                      } focus:scale-110 focus:border-focus [&.focused]:scale-110 [&.focused]:border-focus`}
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
    </Dialog>
  );
};

export default CategoryPinOverlay;
