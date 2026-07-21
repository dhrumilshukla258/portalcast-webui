import React from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import SlideEditor from '@/components/organisms/admin/SlideEditor';
import SlideList from '@/components/organisms/admin/SlideList';
import { useCarouselForm } from '@/hooks/useCarouselForm';

const CarouselConfigManager: React.FC = () => {
  const {
    slides,
    loading,
    showForm,
    setShowForm,
    editingIndex,
    title,
    setTitle,
    description,
    setDescription,
    imageUrl,
    setImageUrl,
    mobileImageUrl,
    setMobileImageUrl,
    tabletImageUrl,
    setTabletImageUrl,
    desktopFile,
    tabletFile,
    mobileFile,
    handleFileSelect,
    clearFileSelect,
    actionType,
    setActionType,
    mediaType,
    setMediaType,
    mediaId,
    setMediaId,
    order,
    setOrder,
    uploading,
    openAddForm,
    openEditForm,
    handleSaveSlide,
    handleDeleteSlide,
    handleMove,
  } = useCarouselForm();

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <RefreshCw className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-gray-800 bg-gray-900/30 p-6 backdrop-blur-md text-center sm:text-left">
        <div>
          <h2 className="text-xl font-black text-white">Carousel Slides</h2>
          <p className="text-sm text-gray-500">Configure VOD welcome banner images and target actions.</p>
        </div>
        <div className="flex w-full sm:w-auto gap-3">
          <button
            type="button"
            onClick={openAddForm}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-colors hover:bg-blue-500"
            data-focusable="true"
          >
            <Plus size={16} />
            Add Slide
          </button>
        </div>
      </div>

      {showForm && (
        <SlideEditor
          editingIndex={editingIndex}
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          imageUrl={imageUrl}
          setImageUrl={setImageUrl}
          tabletImageUrl={tabletImageUrl}
          setTabletImageUrl={setTabletImageUrl}
          mobileImageUrl={mobileImageUrl}
          setMobileImageUrl={setMobileImageUrl}
          desktopFile={desktopFile}
          tabletFile={tabletFile}
          mobileFile={mobileFile}
          onFileSelect={handleFileSelect}
          onClearFile={clearFileSelect}
          actionType={actionType}
          setActionType={setActionType}
          mediaType={mediaType}
          setMediaType={setMediaType}
          mediaId={mediaId}
          setMediaId={setMediaId}
          order={order}
          setOrder={setOrder}
          uploading={uploading}
          onCancel={() => setShowForm(false)}
          onSubmit={handleSaveSlide}
        />
      )}

      <SlideList
        slides={slides}
        onMove={handleMove}
        onEdit={openEditForm}
        onDelete={handleDeleteSlide}
      />
    </div>
  );
};

export default CarouselConfigManager;
