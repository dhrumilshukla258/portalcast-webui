import { Search, Eye, EyeOff, Edit2, ArrowUp, ArrowDown, RefreshCw, X } from 'lucide-react';
import type { Category, ContentType, Item } from '@/hooks/useContentManager';

interface ItemsPanelProps {
  currentCategory: Category | undefined;
  selectedCategoryId: string | null;
  itemSearch: string;
  setItemSearch: (v: string) => void;
  loadingItems: boolean;
  filteredItems: Item[];
  categoryById: Map<string, Category>;
  editingItemId: string | null;
  itemNameDraft: string;
  setItemNameDraft: (v: string) => void;
  itemCatDraft: string;
  setItemCatDraft: (v: string) => void;
  startItemEdit: (item: Item) => void;
  saveItemEdit: (item: Item) => void;
  setEditingItemId: (id: string | null) => void;
  toggleItemHidden: (item: Item) => void;
  resetItem: (item: Item) => void;
  moveItem: (id: string, direction: -1 | 1) => void;
  categories: Category[];
  type: ContentType;
}

const ItemsPanel: React.FC<ItemsPanelProps> = ({
  currentCategory,
  selectedCategoryId,
  itemSearch,
  setItemSearch,
  loadingItems,
  filteredItems,
  categoryById,
  editingItemId,
  itemNameDraft,
  setItemNameDraft,
  itemCatDraft,
  setItemCatDraft,
  startItemEdit,
  saveItemEdit,
  setEditingItemId,
  toggleItemHidden,
  resetItem,
  moveItem,
  categories,
  type,
}) => {
  const isFilteringItems = !!itemSearch;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-white/[0.03]">
      <div className="flex items-center gap-2 border-b border-line p-3">
        <h3 className="flex-1 truncate text-sm font-bold text-fg-soft">
          {currentCategory ? (currentCategory.display_name || currentCategory.title) : 'Select a category'}
        </h3>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            placeholder="Search items..."
            className="w-48 rounded-lg border border-line bg-page py-1.5 pl-8 pr-2 text-xs text-fg outline-hidden focus:border-focus"
          />
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
        {!selectedCategoryId ? (
          <div className="flex h-40 items-center justify-center text-xs italic text-fg-subtle">Select a category to browse items</div>
        ) : loadingItems ? (
          <div className="flex h-24 items-center justify-center text-xs text-fg-subtle">
            <RefreshCw size={16} className="mr-2 animate-spin" /> Loading...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-6 text-center text-xs italic text-fg-subtle">{itemSearch ? 'No matches' : 'No items in this category'}</div>
        ) : (
          filteredItems.map((item, idx) => {
            const displayName = item.display_name || item.name;
            const showOriginal = item.display_name && item.display_name !== item.name;
            const targetCat = item.target_category_id ? categoryById.get(item.target_category_id) : null;
            const showMoved = item.target_category_id && item.target_category_id !== item.original_category_id;
            const isEditing = editingItemId === item.id;
            const hasOverride = item.hidden || item.display_name || item.target_category_id;
            return (
              <div key={item.id} className="border-b border-divider/60">
                <div className={`flex items-center gap-2 px-3 py-2.5 ${item.hidden ? 'opacity-50' : ''}`}>
                  <div className={`h-2 w-2 shrink-0 rounded-full ${item.hidden ? 'bg-red-500' : 'bg-green-500'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-fg-soft">{displayName}</div>
                    {showOriginal && <div className="truncate text-2xs text-fg-subtle">{item.name}</div>}
                    {showMoved && (
                      <div className="truncate text-2xs text-fg-subtle">
                        → {targetCat?.display_name || targetCat?.title || item.target_category_id}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button title="Move up" disabled={isFilteringItems || idx === 0} onClick={() => moveItem(item.id, -1)} className="rounded-sm p-1 text-fg-subtle hover:bg-panel-hover hover:text-fg-soft disabled:opacity-20">
                      <ArrowUp size={12} />
                    </button>
                    <button title="Move down" disabled={isFilteringItems || idx === filteredItems.length - 1} onClick={() => moveItem(item.id, 1)} className="rounded-sm p-1 text-fg-subtle hover:bg-panel-hover hover:text-fg-soft disabled:opacity-20">
                      <ArrowDown size={12} />
                    </button>
                    <button title={item.hidden ? 'Show' : 'Hide'} onClick={() => toggleItemHidden(item)} className="rounded-sm p-1 text-fg-subtle hover:bg-panel-hover hover:text-fg-soft">
                      {item.hidden ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                    <button title="Edit" onClick={() => startItemEdit(item)} className="rounded-sm p-1 text-fg-subtle hover:bg-panel-hover hover:text-fg-soft">
                      <Edit2 size={12} />
                    </button>
                  </div>
                </div>
                {isEditing && (
                  <div className="flex flex-wrap items-center gap-2 bg-panel/60 px-3 py-2">
                    <input
                      autoFocus
                      value={itemNameDraft}
                      onChange={(e) => setItemNameDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveItemEdit(item)}
                      placeholder="Display name (blank = original)"
                      className="min-w-[160px] flex-1 rounded-lg border border-line bg-page px-2 py-1 text-xs text-fg outline-hidden focus:border-focus"
                    />
                    {(type === 'movie' || type === 'series') && (
                      <select
                        value={itemCatDraft}
                        onChange={(e) => setItemCatDraft(e.target.value)}
                        className="rounded-lg border border-line bg-page px-2 py-1 text-xs text-fg outline-hidden focus:border-focus"
                      >
                        <option value="">— Keep in current category —</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.display_name || c.title}</option>
                        ))}
                      </select>
                    )}
                    <button onClick={() => saveItemEdit(item)} className="rounded-lg bg-action px-2 py-1 text-xs font-bold text-on-action hover:bg-action-hover">Save</button>
                    {hasOverride && (
                      <button onClick={() => resetItem(item)} className="rounded-lg border border-yellow-800/50 px-2 py-1 text-xs font-bold text-yellow-500 hover:bg-yellow-900/20">Reset</button>
                    )}
                    <button onClick={() => setEditingItemId(null)} className="text-fg-subtle hover:text-fg"><X size={14} /></button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ItemsPanel;
