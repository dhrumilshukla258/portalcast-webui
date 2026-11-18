import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';

interface CreateProfileModalProps {
  newProfileName: string;
  setNewProfileName: (v: string) => void;
  newProfileDescription: string;
  setNewProfileDescription: (v: string) => void;
  newProfileProviderType: 'stalker' | 'xtream' | 'm3u';
  setNewProfileProviderType: (v: 'stalker' | 'xtream' | 'm3u') => void;
  newProfileM3uUrl: string;
  setNewProfileM3uUrl: (v: string) => void;
  newProfileXmltvUrl: string;
  setNewProfileXmltvUrl: (v: string) => void;
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
  newProfileM3uUrl,
  setNewProfileM3uUrl,
  newProfileXmltvUrl,
  setNewProfileXmltvUrl,
  newProfileUsername,
  setNewProfileUsername,
  newProfilePassword,
  setNewProfilePassword,
  onCancel,
  onCreate,
}) => {
  return (
    <Dialog open onClose={onCancel} labelledBy="create-profile-title" className="max-w-md" dismissOnBackdrop={false}>
      <h2 id="create-profile-title" className="mb-4 text-xl font-bold text-white">Create Profile</h2>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-400">
            Name
          </label>
          <input
            type="text"
            data-focusable="true"
            className="w-full rounded-lg border border-gray-600/50 bg-gray-800/50 p-2 text-white placeholder-gray-500 backdrop-blur-xs focus:border-focus focus:outline-hidden focus:ring-1 focus:ring-focus"
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
            className="w-full resize-none rounded-lg border border-gray-600/50 bg-gray-800/50 p-2 text-white placeholder-gray-500 backdrop-blur-xs focus:border-focus focus:outline-hidden focus:ring-1 focus:ring-focus"
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
                className="h-4 w-4 border-gray-600 bg-gray-700 text-blue-600 focus:ring-focus"
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
                className="h-4 w-4 border-gray-600 bg-gray-700 text-blue-600 focus:ring-focus"
              />
              <span className="text-sm text-gray-300 transition-colors group-hover:text-white">
                Xtream Codes
              </span>
            </label>
            <label className="group flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="newProfileProviderType"
                value="m3u"
                data-focusable="true"
                checked={newProfileProviderType === 'm3u'}
                onChange={() => setNewProfileProviderType('m3u')}
                className="h-4 w-4 border-gray-600 bg-gray-700 text-blue-600 focus:ring-focus"
              />
              <span className="text-sm text-gray-300 transition-colors group-hover:text-white">
                M3U playlist
              </span>
            </label>
          </div>
        </div>

        {newProfileProviderType === 'm3u' && (
          <div className="space-y-3 rounded-xl border border-gray-700/50 bg-gray-800/30 p-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">
                Playlist link (M3U)
              </label>
              <input
                type="url"
                data-focusable="true"
                className="w-full rounded-lg border border-gray-600/50 bg-gray-800/50 p-2 text-sm text-white focus:border-focus focus:outline-hidden"
                placeholder="http://provider.example/get.php?username=…&type=m3u_plus"
                value={newProfileM3uUrl}
                onChange={(e) => setNewProfileM3uUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">
                Guide link (XMLTV, optional)
              </label>
              <input
                type="url"
                data-focusable="true"
                className="w-full rounded-lg border border-gray-600/50 bg-gray-800/50 p-2 text-sm text-white focus:border-focus focus:outline-hidden"
                placeholder="Empty: the guide link inside the playlist"
                value={newProfileXmltvUrl}
                onChange={(e) => setNewProfileXmltvUrl(e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-500">Stored encrypted; the link usually holds your account. Refreshed daily.</p>
          </div>
        )}

        {newProfileProviderType === 'xtream' && (
          <div className="space-y-3 rounded-xl border border-gray-700/50 bg-gray-800/30 p-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">
                Username
              </label>
              <input
                type="text"
                data-focusable="true"
                className="w-full rounded-lg border border-gray-600/50 bg-gray-800/50 p-2 text-sm text-white focus:border-focus focus:outline-hidden"
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
                className="w-full rounded-lg border border-gray-600/50 bg-gray-800/50 p-2 text-sm text-white focus:border-focus focus:outline-hidden"
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
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="accent" onClick={onCreate}>
          Create
        </Button>
      </div>
    </Dialog>
  );
};

export default CreateProfileModal;
