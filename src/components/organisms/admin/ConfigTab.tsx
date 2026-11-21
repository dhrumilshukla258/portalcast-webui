import React from 'react';
import ConfirmationModal from '@/components/molecules/ConfirmationModal';
import ConnectionForm from '@/components/organisms/admin/ConnectionForm';
import LibrarySettingsForm from '@/components/organisms/admin/LibrarySettingsForm';
import ImportUrlModal from '@/components/organisms/admin/ImportUrlModal';
import { useConfigTabActions } from '@/hooks/useConfigTabActions';

const ConfigTab: React.FC = () => {
  const {
    config,
    setConfig,
    groups,
    showImportModal,
    importText,
    setImportText,
    confirmModal,
    setConfirmModal,
    loadingGroups,
    loadingChannels,
    loadingMovies,
    loadingSeries,
    handleImportClick,
    handleModalClose,
    handleParseAndApply,
    handleInputChange,
    handleGroupsChange,
    handleSubmit,
    handleReloadGroups,
    handleRefreshChannels,
    handleRefreshMovieGroups,
    handleRefreshSeriesGroups,
    handleClearWatched,
    handleClearCache,
  } = useConfigTabActions();

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="animate-in fade-in slide-in-from-bottom-4 space-y-8 duration-500"
      >
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <ConnectionForm
            config={config}
            setConfig={setConfig}
            handleInputChange={handleInputChange}
            onImportClick={handleImportClick}
          />

          <LibrarySettingsForm
            config={config}
            groups={groups}
            handleGroupsChange={handleGroupsChange}
            onReloadGroups={handleReloadGroups}
            loadingGroups={loadingGroups}
            onRefreshChannels={handleRefreshChannels}
            loadingChannels={loadingChannels}
            onRefreshMovieGroups={handleRefreshMovieGroups}
            loadingMovies={loadingMovies}
            onRefreshSeriesGroups={handleRefreshSeriesGroups}
            loadingSeries={loadingSeries}
          />
        </div>

        {/* Floating Action Bar */}
        <div className="ui-glass sticky bottom-6 z-20 flex flex-col items-center justify-between gap-4 rounded-2xl border border-accent/30 p-4 sm:flex-row md:p-5">
          <p className="hidden text-xs font-medium text-fg-muted sm:block sm:max-w-sm">
            Changes here apply immediately to the database but require a
            restart for active streams.
          </p>
          <div className="flex w-full items-center gap-3 sm:w-auto sm:justify-end">
            <button
              type="button"
              onClick={handleClearCache}
              className="flex-1 rounded-xl border border-accent/20 bg-accent/5 px-2 py-3 text-xs font-bold text-accent transition-colors hover:bg-accent/10 sm:flex-none sm:border-transparent sm:bg-transparent sm:px-4 sm:py-2"
            >
              Clear Cache
            </button>
            <button
              type="button"
              onClick={handleClearWatched}
              className="flex-1 rounded-xl border border-red-500/20 bg-red-500/5 px-2 py-3 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/10 sm:flex-none sm:border-transparent sm:bg-transparent sm:px-4 sm:py-2"
            >
              Clear History
            </button>
            <button
              type="submit"
              className="flex flex-2 justify-center rounded-xl bg-action px-6 py-3 text-sm font-black text-on-action shadow-lg shadow-accent/40 transition-all hover:-translate-y-0.5 hover:bg-action-hover active:translate-y-0 sm:flex-none sm:px-8"
            >
              Save Config
            </button>
          </div>
        </div>
      </form>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        isDestructive={confirmModal.isDestructive}
      />

      <ImportUrlModal
        isOpen={showImportModal}
        importText={importText}
        onChangeText={setImportText}
        onClose={handleModalClose}
        onApply={handleParseAndApply}
      />
    </>
  );
};

export default ConfigTab;
