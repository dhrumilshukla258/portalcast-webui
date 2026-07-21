import { useProfileManager } from '@/hooks/useProfileManager';
import ConfirmationModal from '@/components/molecules/ConfirmationModal';
import ProfileCard from './profile-manager/ProfileCard';
import CreateProfileModal from './profile-manager/CreateProfileModal';

const ProfileManager = () => {
  const pm = useProfileManager();

  if (pm.loading) {
    return (
      <div className="mx-auto my-5 max-w-6xl rounded-lg bg-gray-800 p-5 text-center text-white">
        <div className="text-lg">Loading profiles...</div>
      </div>
    );
  }

  return (
    <div className="font-sans text-white">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold">Profiles</h2>
          <p className="text-sm text-gray-400">
            Manage your different server configurations
          </p>
        </div>
        <button
          onClick={() => pm.setShowCreateModal(true)}
          data-focusable="true"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-105 hover:bg-blue-500 active:scale-95 sm:w-auto sm:py-2"
        >
          <span>+</span> New Profile
        </button>
      </div>

      <ConfirmationModal
        isOpen={pm.confirmModal.isOpen}
        title={pm.confirmModal.title}
        message={pm.confirmModal.message}
        onConfirm={pm.confirmModal.onConfirm}
        onCancel={() => pm.setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        isDestructive={pm.confirmModal.isDestructive}
        showInput={pm.confirmModal.showInput}
        inputValue={pm.confirmModal.inputValue}
        onInputChange={pm.confirmModal.onInputChange}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pm.profiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            onActivate={pm.handleActivateProfile}
            onDelete={pm.handleDeleteProfile}
            onToggleEnabled={pm.handleToggleEnabled}
            onDuplicate={pm.handleDuplicateProfile}
          />
        ))}
      </div>

      {pm.showCreateModal && (
        <CreateProfileModal
          newProfileName={pm.newProfileName}
          setNewProfileName={pm.setNewProfileName}
          newProfileDescription={pm.newProfileDescription}
          setNewProfileDescription={pm.setNewProfileDescription}
          newProfileProviderType={pm.newProfileProviderType}
          setNewProfileProviderType={pm.setNewProfileProviderType}
          newProfileUsername={pm.newProfileUsername}
          setNewProfileUsername={pm.setNewProfileUsername}
          newProfilePassword={pm.newProfilePassword}
          setNewProfilePassword={pm.setNewProfilePassword}
          onCancel={() => pm.setShowCreateModal(false)}
          onCreate={pm.handleCreateProfile}
        />
      )}
    </div>
  );
};

export default ProfileManager;
