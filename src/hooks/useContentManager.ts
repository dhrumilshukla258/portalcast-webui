import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
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

export type ContentType = 'channel' | 'movie' | 'series';

export interface Category {
  id: string;
  title: string;
  display_name?: string | null;
  hidden?: boolean;
  count?: number;
}

export interface Item {
  id: string;
  name: string;
  display_name?: string | null;
  hidden?: boolean;
  target_category_id?: string | null;
  original_category_id?: string | null;
}

export const isVirtual = (id: string) => id.startsWith('vcat_');

export function useContentManager() {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Built once instead of a categories.find() per rendered item row — this
  // list re-renders on every itemSearch keystroke, and categories can be a
  // large IPTV category list.
  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    for (const cat of categories) map.set(cat.id, cat);
    return map;
  }, [categories]);

  const canAddCat = type === 'movie' || type === 'series';

  return {
    type,
    setType,
    categories,
    selectedCategoryId,
    items,
    catSearch,
    setCatSearch,
    itemSearch,
    setItemSearch,
    loadingCats,
    loadingItems,
    editingCatId,
    setEditingCatId,
    catNameDraft,
    setCatNameDraft,
    editingItemId,
    setEditingItemId,
    itemNameDraft,
    setItemNameDraft,
    itemCatDraft,
    setItemCatDraft,
    addingCat,
    setAddingCat,
    newCatTitle,
    setNewCatTitle,
    selectCategory,
    currentCategory,
    startCatEdit,
    saveCatEdit,
    toggleCatHidden,
    resetCat,
    submitAddCat,
    moveCat,
    sortCatsAlpha,
    resetCatOrder,
    startItemEdit,
    saveItemEdit,
    toggleItemHidden,
    resetItem,
    moveItem,
    filteredCats,
    filteredItems,
    categoryById,
    canAddCat,
  };
}
