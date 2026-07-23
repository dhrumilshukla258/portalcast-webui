interface CreateProfileModalProps {
  newProfileName: string;
  setNewProfileName: (v: string) => void;
  newProfileDescription: string;
  setNewProfileDescription: (v: string) => void;
  newProfileProviderType: 'stalker' | 'xtream';
  setNewProfileProviderType: (v: 'stalker' | 'xtream') => void;
  newProfileUsername: string;
  setNewProfileUsername: (v: string) => void;
  newProfilePassword: string;
  setNewProfilePassword: (v: string) => void;
  onCancel: () => void;
  onCreate: () => void;
}

const CreateProfileModal: React.FC<CreateProfileModalProps> = ({
  newProfileName,
  setNewProfileName,
  newProfileDescription,
  setNewProfileDescription,
  newProfileProviderType,
  setNewProfileProviderType,
  newProfileUsername,
  setNewProfileUsername,
  newProfilePassword,
  setNewProfilePassword,
  onCancel,
  onCreate,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-gray-700/50 bg-gray-900/80 p-6 shadow-2xl backdrop-blur-md">
        <h2 className="mb-4 text-xl font-bold text-white">Create Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">
              Name
            </label>
            <input
              type="text"
              data-focusable="true"
              className="w-full rounded-lg border border-gray-600/50 bg-gray-800/50 p-2 text-white placeholder-gray-500 backdrop-blur-xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., Bedroom STB"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">
              Description
            </label>
            <textarea
              data-focusable="true"
              className="w-full resize-none rounded-lg border border-gray-600/50 bg-gray-800/50 p-2 text-white placeholder-gray-500 backdrop-blur-xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              rows={3}
              value={newProfileDescription}
              onChange={(e) => setNewProfileDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">
              Provider Type
            </label>
            <div className="flex gap-4">
              <label className="group flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="newProfileProviderType"
                  value="stalker"
                  data-focusable="true"
                  checked={newProfileProviderType === 'stalker'}
                  onChange={() => setNewProfileProviderType('stalker')}
                  className="h-4 w-4 border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300 transition-colors group-hover:text-white">
                  Stalker
                </span>
              </label>
              <label className="group flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="newProfileProviderType"
                  value="xtream"
                  data-focusable="true"
                  checked={newProfileProviderType === 'xtream'}
                  onChange={() => setNewProfileProviderType('xtream')}
                  className="h-4 w-4 border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300 transition-colors group-hover:text-white">
                  Xtream Codes
                </span>
              </label>
            </div>
          </div>

          {newProfileProviderType === 'xtream' && (
            <div className="space-y-3 rounded-xl border border-gray-700/50 bg-gray-800/30 p-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">
                  Username
                </label>
                <input
                  type="text"
                  data-focusable="true"
                  className="w-full rounded-lg border border-gray-600/50 bg-gray-800/50 p-2 text-sm text-white focus:border-blue-500 focus:outline-hidden"
                  value={newProfileUsername}
                  onChange={(e) => setNewProfileUsername(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">
                  Password
                </label>
                <input
                  type="text"
                  data-focusable="true"
                  className="w-full rounded-lg border border-gray-600/50 bg-gray-800/50 p-2 text-sm text-white focus:border-blue-500 focus:outline-hidden"
                  value={newProfilePassword}
                  onChange={(e) => setNewProfilePassword(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="rounded-lg border border-blue-500/20 bg-blue-900/10 p-3 text-xs text-blue-300">
            This profile will inherit other settings from your current
            configuration.
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            data-focusable="true"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            data-focusable="true"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500 active:scale-95"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateProfileModal;
