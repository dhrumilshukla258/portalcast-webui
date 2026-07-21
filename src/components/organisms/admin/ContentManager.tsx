import React from 'react';
import { useContentManager, type ContentType } from '@/hooks/useContentManager';
import CategoriesPanel from './content-manager/CategoriesPanel';
import ItemsPanel from './content-manager/ItemsPanel';

const ContentManager: React.FC = () => {
  const cm = useContentManager();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-800 bg-gray-900/40 p-1.5">
        {(['channel', 'movie', 'series'] as ContentType[]).map((t) => (
          <button
            key={t}
            onClick={() => cm.setType(t)}
            className={`rounded-xl px-4 py-2 text-xs font-bold uppercase transition-all ${
              cm.type === t ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
            }`}
            data-focusable="true"
          >
            {t === 'channel' ? 'Live' : t === 'movie' ? 'VOD' : 'Series'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        <CategoriesPanel
          categories={cm.categories}
          filteredCats={cm.filteredCats}
          catSearch={cm.catSearch}
          setCatSearch={cm.setCatSearch}
          loadingCats={cm.loadingCats}
          selectedCategoryId={cm.selectedCategoryId}
          selectCategory={cm.selectCategory}
          editingCatId={cm.editingCatId}
          catNameDraft={cm.catNameDraft}
          setCatNameDraft={cm.setCatNameDraft}
          startCatEdit={cm.startCatEdit}
          saveCatEdit={cm.saveCatEdit}
          setEditingCatId={cm.setEditingCatId}
          toggleCatHidden={cm.toggleCatHidden}
          resetCat={cm.resetCat}
          moveCat={cm.moveCat}
          sortCatsAlpha={cm.sortCatsAlpha}
          resetCatOrder={cm.resetCatOrder}
          addingCat={cm.addingCat}
          setAddingCat={cm.setAddingCat}
          newCatTitle={cm.newCatTitle}
          setNewCatTitle={cm.setNewCatTitle}
          submitAddCat={cm.submitAddCat}
          canAddCat={cm.canAddCat}
        />

        <ItemsPanel
          currentCategory={cm.currentCategory}
          selectedCategoryId={cm.selectedCategoryId}
          itemSearch={cm.itemSearch}
          setItemSearch={cm.setItemSearch}
          loadingItems={cm.loadingItems}
          filteredItems={cm.filteredItems}
          categoryById={cm.categoryById}
          editingItemId={cm.editingItemId}
          itemNameDraft={cm.itemNameDraft}
          setItemNameDraft={cm.setItemNameDraft}
          itemCatDraft={cm.itemCatDraft}
          setItemCatDraft={cm.setItemCatDraft}
          startItemEdit={cm.startItemEdit}
          saveItemEdit={cm.saveItemEdit}
          setEditingItemId={cm.setEditingItemId}
          toggleItemHidden={cm.toggleItemHidden}
          resetItem={cm.resetItem}
          moveItem={cm.moveItem}
          categories={cm.categories}
          type={cm.type}
        />
      </div>
    </div>
  );
};

export default ContentManager;
