import { useMemo, useState } from 'react';
import type { ChannelGroup } from '@/types';
import { useAuth } from '@/context/AuthContext';

export function useCategorySelector(
  categories: ChannelGroup[],
  contentType: 'movie' | 'series',
  providerKey: string,
  onSelectCategory: (categoryId: string, categoryTitle: string) => void,
  setShowAllOverlay: (show: boolean) => void
) {
  const { user, updatePreferences } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const key = `${providerKey}_${contentType}`;
  const pinnedIds = useMemo(() => {
    return user?.preferences?.pinnedCategories?.[key] || [];
  }, [user, key]);

  // User's manually-dragged order (does NOT change based on what was watched/selected —
  // only an explicit drag-and-drop reorder updates this).
  const customOrder = useMemo(() => {
    return user?.preferences?.categoryOrder?.[key] || [];
  }, [user, key]);

  // Sort categories: "ALL" first, then the user's saved manual order (if any), then any
  // remaining categories alphabetically, with "adult" categories always pushed to the end.
  const sortedCategories = useMemo(() => {
    if (!categories || categories.length === 0) return [];

    const allCategory = categories.find((cat) => cat.id === '*') || { id: '*', title: 'ALL' };
    const remainingCategories = categories.filter((cat) => cat.id !== '*');

    let ordered: ChannelGroup[];
    if (customOrder.length > 0) {
      const byId = new Map(remainingCategories.map((c) => [c.id, c]));
      const known = customOrder
        .map((id: string) => byId.get(id))
        .filter((c): c is ChannelGroup => !!c);
      const knownIds = new Set(customOrder);
      const rest = remainingCategories
        .filter((c) => !knownIds.has(c.id))
        .sort((a, b) => a.title.localeCompare(b.title));
      ordered = [...known, ...rest];
    } else {
      ordered = [...remainingCategories].sort((a, b) => a.title.localeCompare(b.title));
    }

    const combined = [allCategory, ...ordered];

    // Filter adult categories and push them to the end
    const cleanCategories = combined.filter(
      (cat) => !cat.title.toLowerCase().includes('adult')
    );
    const adultCategories = combined.filter(
      (cat) => cat.title.toLowerCase().includes('adult')
    );

    return [...cleanCategories, ...adultCategories];
  }, [categories, customOrder]);

  const handleReorder = async (orderedIds: string[]) => {
    const currentOrderRecord = user?.preferences?.categoryOrder || {};
    await updatePreferences({
      categoryOrder: { ...currentOrderRecord, [key]: orderedIds },
    });
  };

  // Determine what is listed "outside" (the horizontal bar)
  const outsideCategories = useMemo(() => {
    if (pinnedIds.length === 0) {
      // Default to showing all categories if none are pinned
      return sortedCategories;
    }
    // If pinned categories exist, show "ALL" + the pinned categories
    const allCategory = sortedCategories.find((cat) => cat.id === '*') || { id: '*', title: 'ALL' };
    const pinnedIdSet = new Set(pinnedIds);
    const pinnedItems = sortedCategories.filter((cat) => pinnedIdSet.has(cat.id));
    return [allCategory, ...pinnedItems];
  }, [sortedCategories, pinnedIds]);

  // Filtered categories for the full search list inside overlay
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return sortedCategories;
    return sortedCategories.filter((cat) =>
      cat.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sortedCategories, searchQuery]);

  // Toggle pinning a category
  const handleTogglePin = async (e: React.MouseEvent, catId: string) => {
    e.stopPropagation();
    if (catId === '*') return; // Cannot pin/unpin 'ALL'

    let newPinned: string[];
    if (pinnedIds.includes(catId)) {
      newPinned = pinnedIds.filter((id: string) => id !== catId);
    } else {
      newPinned = [...pinnedIds, catId];
    }

    const currentPinnedRecord = user?.preferences?.pinnedCategories || {};
    await updatePreferences({
      pinnedCategories: {
        ...currentPinnedRecord,
        [key]: newPinned,
      },
    });
  };

  // Select category
  const handleSelect = (catId: string, catTitle: string) => {
    const updatedLastSelected = {
      ...(user?.preferences?.lastSelectedCategory || {}),
      [key]: catId,
    };
    const updatedLastSelectedTitle = {
      ...(user?.preferences?.lastSelectedCategoryTitle || {}),
      [key]: catTitle,
    };

    let updatedRecentCategories = user?.preferences?.recentCategories || {};
    if (catId !== '*') {
      const currentRecents = updatedRecentCategories[key] || [];
      const newRecents = [catId, ...currentRecents.filter((id) => id !== catId)].slice(0, 5);
      updatedRecentCategories = {
        ...updatedRecentCategories,
        [key]: newRecents,
      };
    }

    updatePreferences({
      lastSelectedCategory: updatedLastSelected,
      lastSelectedCategoryTitle: updatedLastSelectedTitle,
      recentCategories: updatedRecentCategories,
    });
    onSelectCategory(catId, catTitle);
    setShowAllOverlay(false);
    setSearchQuery('');
  };

  const handleClearAllPins = async () => {
    const currentPinnedRecord = user?.preferences?.pinnedCategories || {};
    await updatePreferences({
      pinnedCategories: {
        ...currentPinnedRecord,
        [key]: [],
      },
    });
  };

  return {
    searchQuery,
    setSearchQuery,
    pinnedIds,
    sortedCategories,
    outsideCategories,
    filteredCategories,
    handleReorder,
    handleTogglePin,
    handleSelect,
    handleClearAllPins,
  };
}
