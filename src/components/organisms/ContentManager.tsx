import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';
import {
  Search,
  Eye,
  EyeOff,
  Edit2,
  Plus,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  RotateCcw,
  ArrowUpAZ,
  X,
} from 'lucide-react';
import {
  getGenres,
  getGenreItems,
  updateGenre,
  deleteGenre,
  createGenre,
  reorderGenres,
  resetGenreOrder,
  updateGenreItem,
  deleteGenreItem,
  reorderGenreItems,
} from '@/api/endpoints/admin';

type ContentType = 'channel' | 'movie' | 'series';

interface Category {
  id: string;
  title: string;
  display_name?: string | null;
  hidden?: boolean;
  count?: number;
}

interface Item {
  id: string;
  name: string;
  display_name?: string | null;
  hidden?: boolean;
  target_category_id?: string | null;
  original_category_id?: string | null;
}

const isVirtual = (id: string) => id.startsWith('vcat_');

const ContentManager: React.FC = () => {
  const [type, setType] = useState<ContentType>('channel');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [catSearch, setCatSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [loadingCats, setLoadingCats] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catNameDraft, setCatNameDraft] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemNameDraft, setItemNameDraft] = useState('');
  const [itemCatDraft, setItemCatDraft] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [newCatTitle, setNewCatTitle] = useState('');

  const catsRequestRef = useRef(0);

  const loadCategories = async (t: ContentType) => {
    const requestId = ++catsRequestRef.current;
    setLoadingCats(true);
    try {
      const res = await getGenres(t);
      if (requestId !== catsRequestRef.current) return;
      setCategories(res);
    } catch {
      if (requestId !== catsRequestRef.current) return;
      toast.error('Failed to load categories');
    } finally {
      if (requestId === catsRequestRef.current) setLoadingCats(false);
    }
  };

  // Guards against out-of-order responses: if the user clicks category A then
  // quickly clicks category B, A's request can resolve after B's and would
  // otherwise overwrite B's items with stale data. Only the response matching
  // the most recently requested category is ever applied.
  const itemsRequestRef = useRef(0);

  const loadItems = async (categoryId: string, t: ContentType) => {
    const requestId = ++itemsRequestRef.current;
    setLoadingItems(true);
    try {
      const res = await getGenreItems(t, categoryId);
      if (requestId !== itemsRequestRef.current) return;
      setItems(res);
    } catch {
      if (requestId !== itemsRequestRef.current) return;
      toast.error('Failed to load items');
    } finally {
      if (requestId === itemsRequestRef.current) setLoadingItems(false);
    }
  };

  useEffect(() => {
    setSelectedCategoryId(null);
    setItems([]);
    setCatSearch('');
    setItemSearch('');
    loadCategories(type);
  }, [type]);

  const selectCategory = (id: string) => {
    setSelectedCategoryId(id);
    setItemSearch('');
    loadItems(id, type);
  };

  const currentCategory = categories.find((c) => c.id === selectedCategoryId);

  // ── Category actions ──────────────────────────────────────────────────────

  const startCatEdit = (cat: Category) => {
    setEditingCatId(cat.id);
    setCatNameDraft(cat.display_name || cat.title || '');
  };

  const saveCatEdit = async (cat: Category) => {
    try {
      const val = catNameDraft.trim();
      if (isVirtual(cat.id)) {
        await updateGenre(type, cat.id, { display_name: null, hidden: false, virtual_title: val || cat.title });
      } else {
        await updateGenre(type, cat.id, { display_name: val || null, hidden: cat.hidden ?? false });
      }
      setEditingCatId(null);
      await loadCategories(type);
    } catch {
      toast.error('Failed to save category');
    }
  };

  const toggleCatHidden = async (cat: Category) => {
    try {
      await updateGenre(type, cat.id, { display_name: cat.display_name ?? null, hidden: !cat.hidden });
      await loadCategories(type);
    } catch {
      toast.error('Failed to update category');
    }
  };

  const resetCat = async (cat: Category) => {
    if (isVirtual(cat.id)) {
      const count = cat.count ?? 0;
      const msg = count > 0
        ? `Delete "${cat.title}"? ${count} item${count === 1 ? '' : 's'} will be moved back to their original categories.`
        : `Delete "${cat.title}"?`;
      if (!window.confirm(msg)) return;
    }
    try {
      await deleteGenre(type, cat.id);
      setEditingCatId(null);
      if (selectedCategoryId === cat.id) {
        setSelectedCategoryId(null);
        setItems([]);
      }
      await loadCategories(type);
    } catch {
      toast.error('Failed to reset category');
    }
  };

  const submitAddCat = async () => {
    const title = newCatTitle.trim();
    if (!title) return;
    try {
      await createGenre(type, title);
      setNewCatTitle('');
      setAddingCat(false);
      await loadCategories(type);
    } catch {
      toast.error('Failed to add category');
    }
  };

  const persistCatOrder = async (ordered: Category[]) => {
    try {
      await reorderGenres(type, {
        order: ordered.map((c, i) => ({ id: c.id, sort_order: i })),
      });
    } catch {
      toast.error('Failed to save category order');
    }
  };

  const moveCat = async (id: string, direction: -1 | 1) => {
    const idx = categories.findIndex((c) => c.id === id);
    const swapIdx = idx + direction;
    if (idx === -1 || swapIdx < 0 || swapIdx >= categories.length) return;
    const reordered = [...categories];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    setCategories(reordered);
    await persistCatOrder(reordered);
  };

  const sortCatsAlpha = async () => {
    const sorted = [...categories].sort((a, b) =>
      (a.display_name || a.title).localeCompare(b.display_name || b.title)
    );
    setCategories(sorted);
    await persistCatOrder(sorted);
  };

  const resetCatOrder = async () => {
    if (!window.confirm('Reset category order to original portal order?')) return;
    try {
      await resetGenreOrder(type);
      await loadCategories(type);
    } catch {
      toast.error('Failed to reset order');
    }
  };

  // ── Item actions ──────────────────────────────────────────────────────────

  const startItemEdit = (item: Item) => {
    setEditingItemId(item.id);
    setItemNameDraft(item.display_name || '');
    setItemCatDraft(item.target_category_id || '');
  };

  const saveItemEdit = async (item: Item) => {
    try {
      await updateGenreItem(type, item.id, {
        display_name: itemNameDraft.trim() || null,
        hidden: item.hidden ?? false,
        target_category_id: itemCatDraft || null,
        original_category_id: item.original_category_id ?? null,
      });
      setEditingItemId(null);
      if (selectedCategoryId) await loadItems(selectedCategoryId, type);
    } catch {
      toast.error('Failed to save item');
    }
  };

  const toggleItemHidden = async (item: Item) => {
    try {
      await updateGenreItem(type, item.id, {
        display_name: item.display_name ?? null,
        hidden: !item.hidden,
        target_category_id: item.target_category_id ?? null,
        original_category_id: item.original_category_id ?? null,
      });
      if (selectedCategoryId) await loadItems(selectedCategoryId, type);
    } catch {
      toast.error('Failed to update item');
    }
  };

  const resetItem = async (item: Item) => {
    try {
      await deleteGenreItem(type, item.id);
      setEditingItemId(null);
      if (selectedCategoryId) await loadItems(selectedCategoryId, type);
    } catch {
      toast.error('Failed to reset item');
    }
  };

  const moveItem = async (id: string, direction: -1 | 1) => {
    if (!selectedCategoryId) return;
    const idx = items.findIndex((i) => i.id === id);
    const swapIdx = idx + direction;
    if (idx === -1 || swapIdx < 0 || swapIdx >= items.length) return;
    const reordered = [...items];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    setItems(reordered);
    try {
      await reorderGenreItems(type, selectedCategoryId, {
        order: reordered.map((it, i) => ({ id: it.id, sort_order: i })),
      });
    } catch {
      toast.error('Failed to save item order');
    }
  };

  // ── Derived / filtered lists ──────────────────────────────────────────────

  const filteredCats = catSearch
    ? categories.filter((c) =>
        (c.display_name || c.title).toLowerCase().includes(catSearch.toLowerCase()) ||
        c.title.toLowerCase().includes(catSearch.toLowerCase())
      )
    : categories;

  const filteredItems = itemSearch
    ? items.filter((i) =>
        (i.display_name || i.name).toLowerCase().includes(itemSearch.toLowerCase()) ||
        i.name.toLowerCase().includes(itemSearch.toLowerCase())
      )
    : items;

  const isFilteringCats = !!catSearch;
  const isFilteringItems = !!itemSearch;
  const canAddCat = type === 'movie' || type === 'series';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-800 bg-gray-900/40 p-1.5">
        {(['channel', 'movie', 'series'] as ContentType[]).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded-xl px-4 py-2 text-xs font-bold uppercase transition-all ${
              type === t ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
            }`}
            data-focusable="true"
          >
            {t === 'channel' ? 'Live' : t === 'movie' ? 'VOD' : 'Series'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        {/* Categories panel */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/30">
          <div className="flex items-center gap-2 border-b border-gray-800 p-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                placeholder="Search categories..."
                className="w-full rounded-lg border border-gray-800 bg-gray-950 py-1.5 pl-8 pr-2 text-xs text-white outline-none focus:border-blue-500"
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
                className="flex-1 rounded-lg border border-gray-800 bg-gray-950 px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
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
                      <div className={`h-2 w-2 flex-shrink-0 rounded-full ${cat.hidden ? 'bg-red-500' : 'bg-green-500'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-gray-200">
                          {displayName}
                          {isVirtual(cat.id) && <span className="ml-1.5 text-[10px] text-blue-400">custom</span>}
                        </div>
                        {showOriginal && <div className="truncate text-[11px] text-gray-500">{cat.title}</div>}
                      </div>
                      {cat.count !== undefined && <span className="flex-shrink-0 text-[11px] text-gray-500">{cat.count}</span>}
                      <div className="flex flex-shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button title="Move up" disabled={!isFilteringCats ? idx === 0 : true} onClick={() => moveCat(cat.id, -1)} className="rounded p-1 text-gray-500 hover:bg-gray-700 hover:text-gray-200 disabled:opacity-20">
                          <ArrowUp size={12} />
                        </button>
                        <button title="Move down" disabled={!isFilteringCats ? idx === filteredCats.length - 1 : true} onClick={() => moveCat(cat.id, 1)} className="rounded p-1 text-gray-500 hover:bg-gray-700 hover:text-gray-200 disabled:opacity-20">
                          <ArrowDown size={12} />
                        </button>
                        {!isVirtual(cat.id) && (
                          <button title={cat.hidden ? 'Show' : 'Hide'} onClick={() => toggleCatHidden(cat)} className="rounded p-1 text-gray-500 hover:bg-gray-700 hover:text-gray-200">
                            {cat.hidden ? <Eye size={12} /> : <EyeOff size={12} />}
                          </button>
                        )}
                        <button title="Edit" onClick={() => startCatEdit(cat)} className="rounded p-1 text-gray-500 hover:bg-gray-700 hover:text-gray-200">
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
                          className="flex-1 rounded-lg border border-gray-800 bg-gray-950 px-2 py-1 text-xs text-white outline-none focus:border-blue-500"
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

        {/* Items panel */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/30">
          <div className="flex items-center gap-2 border-b border-gray-800 p-3">
            <h3 className="flex-1 truncate text-sm font-bold text-gray-300">
              {currentCategory ? (currentCategory.display_name || currentCategory.title) : 'Select a category'}
            </h3>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Search items..."
                className="w-48 rounded-lg border border-gray-800 bg-gray-950 py-1.5 pl-8 pr-2 text-xs text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
            {!selectedCategoryId ? (
              <div className="flex h-40 items-center justify-center text-xs italic text-gray-500">Select a category to browse items</div>
            ) : loadingItems ? (
              <div className="flex h-24 items-center justify-center text-xs text-gray-500">
                <RefreshCw size={16} className="mr-2 animate-spin" /> Loading...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-6 text-center text-xs italic text-gray-500">{itemSearch ? 'No matches' : 'No items in this category'}</div>
            ) : (
              filteredItems.map((item, idx) => {
                const displayName = item.display_name || item.name;
                const showOriginal = item.display_name && item.display_name !== item.name;
                const targetCat = item.target_category_id ? categories.find((c) => c.id === item.target_category_id) : null;
                const showMoved = item.target_category_id && item.target_category_id !== item.original_category_id;
                const isEditing = editingItemId === item.id;
                const hasOverride = item.hidden || item.display_name || item.target_category_id;
                return (
                  <div key={item.id} className="border-b border-gray-800/60">
                    <div className={`flex items-center gap-2 px-3 py-2.5 ${item.hidden ? 'opacity-50' : ''}`}>
                      <div className={`h-2 w-2 flex-shrink-0 rounded-full ${item.hidden ? 'bg-red-500' : 'bg-green-500'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-gray-200">{displayName}</div>
                        {showOriginal && <div className="truncate text-[11px] text-gray-500">{item.name}</div>}
                        {showMoved && (
                          <div className="truncate text-[11px] text-gray-500">
                            → {targetCat?.display_name || targetCat?.title || item.target_category_id}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1">
                        <button title="Move up" disabled={isFilteringItems || idx === 0} onClick={() => moveItem(item.id, -1)} className="rounded p-1 text-gray-500 hover:bg-gray-700 hover:text-gray-200 disabled:opacity-20">
                          <ArrowUp size={12} />
                        </button>
                        <button title="Move down" disabled={isFilteringItems || idx === filteredItems.length - 1} onClick={() => moveItem(item.id, 1)} className="rounded p-1 text-gray-500 hover:bg-gray-700 hover:text-gray-200 disabled:opacity-20">
                          <ArrowDown size={12} />
                        </button>
                        <button title={item.hidden ? 'Show' : 'Hide'} onClick={() => toggleItemHidden(item)} className="rounded p-1 text-gray-500 hover:bg-gray-700 hover:text-gray-200">
                          {item.hidden ? <Eye size={12} /> : <EyeOff size={12} />}
                        </button>
                        <button title="Edit" onClick={() => startItemEdit(item)} className="rounded p-1 text-gray-500 hover:bg-gray-700 hover:text-gray-200">
                          <Edit2 size={12} />
                        </button>
                      </div>
                    </div>
                    {isEditing && (
                      <div className="flex flex-wrap items-center gap-2 bg-gray-900/60 px-3 py-2">
                        <input
                          autoFocus
                          value={itemNameDraft}
                          onChange={(e) => setItemNameDraft(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveItemEdit(item)}
                          placeholder="Display name (blank = original)"
                          className="min-w-[160px] flex-1 rounded-lg border border-gray-800 bg-gray-950 px-2 py-1 text-xs text-white outline-none focus:border-blue-500"
                        />
                        {(type === 'movie' || type === 'series') && (
                          <select
                            value={itemCatDraft}
                            onChange={(e) => setItemCatDraft(e.target.value)}
                            className="rounded-lg border border-gray-800 bg-gray-950 px-2 py-1 text-xs text-white outline-none focus:border-blue-500"
                          >
                            <option value="">— Keep in current category —</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>{c.display_name || c.title}</option>
                            ))}
                          </select>
                        )}
                        <button onClick={() => saveItemEdit(item)} className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-bold text-white hover:bg-blue-500">Save</button>
                        {hasOverride && (
                          <button onClick={() => resetItem(item)} className="rounded-lg border border-yellow-800/50 px-2 py-1 text-xs font-bold text-yellow-500 hover:bg-yellow-900/20">Reset</button>
                        )}
                        <button onClick={() => setEditingItemId(null)} className="text-gray-500 hover:text-white"><X size={14} /></button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentManager;
