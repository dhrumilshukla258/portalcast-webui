import { Search, Eye, EyeOff, Edit2, Plus, ArrowUp, ArrowDown, RefreshCw, RotateCcw, ArrowUpAZ, X } from 'lucide-react';
import { isVirtual, type Category } from '@/hooks/useContentManager';

interface CategoriesPanelProps {
  categories: Category[];
  filteredCats: Category[];
  catSearch: string;
  setCatSearch: (v: string) => void;
  loadingCats: boolean;
  selectedCategoryId: string | null;
  selectCategory: (id: string) => void;
  editingCatId: string | null;
  catNameDraft: string;
  setCatNameDraft: (v: string) => void;
  startCatEdit: (cat: Category) => void;
  saveCatEdit: (cat: Category) => void;
  setEditingCatId: (id: string | null) => void;
  toggleCatHidden: (cat: Category) => void;
  resetCat: (cat: Category) => void;
  moveCat: (id: string, direction: -1 | 1) => void;
  sortCatsAlpha: () => void;
  resetCatOrder: () => void;
  addingCat: boolean;
  setAddingCat: (v: boolean | ((prev: boolean) => boolean)) => void;
  newCatTitle: string;
  setNewCatTitle: (v: string) => void;
  submitAddCat: () => void;
  canAddCat: boolean;
}

const CategoriesPanel: React.FC<CategoriesPanelProps> = ({
  filteredCats,
  catSearch,
  setCatSearch,
  loadingCats,
  selectedCategoryId,
  selectCategory,
  editingCatId,
  catNameDraft,
  setCatNameDraft,
  startCatEdit,
  saveCatEdit,
  setEditingCatId,
  toggleCatHidden,
  resetCat,
  moveCat,
  sortCatsAlpha,
  resetCatOrder,
  addingCat,
  setAddingCat,
  newCatTitle,
  setNewCatTitle,
  submitAddCat,
  canAddCat,
}) => {
  const isFilteringCats = !!catSearch;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/30">
      <div className="flex items-center gap-2 border-b border-gray-800 p-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={catSearch}
            onChange={(e) => setCatSearch(e.target.value)}
            placeholder="Search categories..."
            className="w-full rounded-lg border border-gray-800 bg-gray-950 py-1.5 pl-8 pr-2 text-xs text-white outline-hidden focus:border-blue-500"
          />
        </div>
        <button title="Sort A-Z" onClick={sortCatsAlpha} className="rounded-lg bg-gray-800 p-1.5 text-gray-400 hover:bg-gray-700 hover:text-gray-200">
          <ArrowUpAZ size={14} />
        </button>
        <button title="Restore original order" onClick={resetCatOrder} className="rounded-lg bg-gray-800 p-1.5 text-gray-400 hover:bg-gray-700 hover:text-gray-200">
          <RotateCcw size={14} />
        </button>
        {canAddCat && (
          <button title="Add category" onClick={() => setAddingCat((v) => !v)} className="rounded-lg bg-blue-900/30 border border-blue-900/50 p-1.5 text-blue-400 hover:bg-blue-900/50">
            <Plus size={14} />
          </button>
        )}
      </div>

      {addingCat && (
        <div className="flex items-center gap-2 border-b border-gray-800 bg-gray-900/40 p-3">
          <input
            autoFocus
            value={newCatTitle}
            onChange={(e) => setNewCatTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitAddCat();
              if (e.key === 'Escape') setAddingCat(false);
            }}
            placeholder="Category name..."
            className="flex-1 rounded-lg border border-gray-800 bg-gray-950 px-3 py-1.5 text-xs text-white outline-hidden focus:border-blue-500"
          />
          <button onClick={submitAddCat} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500">Create</button>
          <button onClick={() => setAddingCat(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
        </div>
      )}

      <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
        {loadingCats ? (
          <div className="flex h-24 items-center justify-center text-xs text-gray-500">
            <RefreshCw size={16} className="mr-2 animate-spin" /> Loading...
          </div>
        ) : filteredCats.length === 0 ? (
          <div className="p-6 text-center text-xs italic text-gray-500">No categories found</div>
        ) : (
          filteredCats.map((cat, idx) => {
            const displayName = cat.display_name || cat.title;
            const showOriginal = !isVirtual(cat.id) && cat.display_name && cat.display_name !== cat.title;
            const isEditing = editingCatId === cat.id;
            return (
              <div key={cat.id} className="border-b border-gray-800/60">
                <div
                  onClick={() => selectCategory(cat.id)}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-2.5 transition-colors hover:bg-gray-800/50 ${
                    selectedCategoryId === cat.id ? 'bg-blue-900/20' : ''
                  } ${cat.hidden ? 'opacity-50' : ''}`}
                >
                  <div className={`h-2 w-2 shrink-0 rounded-full ${cat.hidden ? 'bg-red-500' : 'bg-green-500'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-gray-200">
                      {displayName}
                      {isVirtual(cat.id) && <span className="ml-1.5 text-[10px] text-blue-400">custom</span>}
                    </div>
                    {showOriginal && <div className="truncate text-[11px] text-gray-500">{cat.title}</div>}
                  </div>
                  {cat.count !== undefined && <span className="shrink-0 text-[11px] text-gray-500">{cat.count}</span>}
                  <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button title="Move up" disabled={!isFilteringCats ? idx === 0 : true} onClick={() => moveCat(cat.id, -1)} className="rounded-sm p-1 text-gray-500 hover:bg-gray-700 hover:text-gray-200 disabled:opacity-20">
                      <ArrowUp size={12} />
                    </button>
                    <button title="Move down" disabled={!isFilteringCats ? idx === filteredCats.length - 1 : true} onClick={() => moveCat(cat.id, 1)} className="rounded-sm p-1 text-gray-500 hover:bg-gray-700 hover:text-gray-200 disabled:opacity-20">
                      <ArrowDown size={12} />
                    </button>
                    {!isVirtual(cat.id) && (
                      <button title={cat.hidden ? 'Show' : 'Hide'} onClick={() => toggleCatHidden(cat)} className="rounded-sm p-1 text-gray-500 hover:bg-gray-700 hover:text-gray-200">
                        {cat.hidden ? <Eye size={12} /> : <EyeOff size={12} />}
                      </button>
                    )}
                    <button title="Edit" onClick={() => startCatEdit(cat)} className="rounded-sm p-1 text-gray-500 hover:bg-gray-700 hover:text-gray-200">
                      <Edit2 size={12} />
                    </button>
                  </div>
                </div>
                {isEditing && (
                  <div className="flex items-center gap-2 bg-gray-900/60 px-3 py-2">
                    <input
                      autoFocus
                      value={catNameDraft}
                      onChange={(e) => setCatNameDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveCatEdit(cat)}
                      placeholder={isVirtual(cat.id) ? 'Category name' : 'Display name (blank = original)'}
                      className="flex-1 rounded-lg border border-gray-800 bg-gray-950 px-2 py-1 text-xs text-white outline-hidden focus:border-blue-500"
                    />
                    <button onClick={() => saveCatEdit(cat)} className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-bold text-white hover:bg-blue-500">Save</button>
                    {(isVirtual(cat.id) || cat.hidden || cat.display_name) && (
                      <button onClick={() => resetCat(cat)} className="rounded-lg border border-yellow-800/50 px-2 py-1 text-xs font-bold text-yellow-500 hover:bg-yellow-900/20">
                        {isVirtual(cat.id) ? 'Delete' : 'Reset'}
                      </button>
                    )}
                    <button onClick={() => setEditingCatId(null)} className="text-gray-500 hover:text-white"><X size={14} /></button>
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

export default CategoriesPanel;
