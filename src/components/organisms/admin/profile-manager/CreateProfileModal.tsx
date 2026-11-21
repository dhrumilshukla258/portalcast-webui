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
      <h2 id="create-profile-title" className="mb-4 text-xl font-bold text-fg">Create Profile</h2>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-fg-muted">
            Name
          </label>
          <input
            type="text"
            data-focusable="true"
            className="w-full rounded-lg border border-divider/50 bg-panel-raised/50 p-2 text-fg placeholder-fg-subtle backdrop-blur-xs focus:border-focus focus:outline-hidden focus:ring-1 focus:ring-focus"
            placeholder="e.g., Bedroom STB"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-fg-muted">
            Description
          </label>
          <textarea
            data-focusable="true"
            className="w-full resize-none rounded-lg border border-divider/50 bg-panel-raised/50 p-2 text-fg placeholder-fg-subtle backdrop-blur-xs focus:border-focus focus:outline-hidden focus:ring-1 focus:ring-focus"
            rows={3}
            value={newProfileDescription}
            onChange={(e) => setNewProfileDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-fg-muted">
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
                className="h-4 w-4 border-line-strong bg-panel-hover text-accent focus:ring-focus"
              />
              <span className="text-sm text-fg-soft transition-colors group-hover:text-fg">
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
                className="h-4 w-4 border-line-strong bg-panel-hover text-accent focus:ring-focus"
              />
              <span className="text-sm text-fg-soft transition-colors group-hover:text-fg">
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
                className="h-4 w-4 border-line-strong bg-panel-hover text-accent focus:ring-focus"
              />
              <span className="text-sm text-fg-soft transition-colors group-hover:text-fg">
                M3U playlist
              </span>
            </label>
          </div>
        </div>

        {newProfileProviderType === 'm3u' && (
          <div className="space-y-3 rounded-xl border border-divider/50 bg-panel-raised/30 p-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-fg-muted">
                Playlist link (M3U)
              </label>
              <input
                type="url"
                data-focusable="true"
                className="w-full rounded-lg border border-divider/50 bg-panel-raised/50 p-2 text-sm text-fg focus:border-focus focus:outline-hidden"
                placeholder="http://provider.example/get.php?username=…&type=m3u_plus"
                value={newProfileM3uUrl}
                onChange={(e) => setNewProfileM3uUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-fg-muted">
                Guide link (XMLTV, optional)
              </label>
              <input
                type="url"
                data-focusable="true"
                className="w-full rounded-lg border border-divider/50 bg-panel-raised/50 p-2 text-sm text-fg focus:border-focus focus:outline-hidden"
                placeholder="Empty: the guide link inside the playlist"
                value={newProfileXmltvUrl}
                onChange={(e) => setNewProfileXmltvUrl(e.target.value)}
              />
            </div>
            <p className="text-xs text-fg-subtle">Stored encrypted; the link usually holds your account. Refreshed daily.</p>
          </div>
        )}

        {newProfileProviderType === 'xtream' && (
          <div className="space-y-3 rounded-xl border border-divider/50 bg-panel-raised/30 p-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-fg-muted">
                Username
              </label>
              <input
                type="text"
                data-focusable="true"
                className="w-full rounded-lg border border-divider/50 bg-panel-raised/50 p-2 text-sm text-fg focus:border-focus focus:outline-hidden"
                value={newProfileUsername}
                onChange={(e) => setNewProfileUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-fg-muted">
                Password
              </label>
              <input
                type="text"
                data-focusable="true"
                className="w-full rounded-lg border border-divider/50 bg-panel-raised/50 p-2 text-sm text-fg focus:border-focus focus:outline-hidden"
                value={newProfilePassword}
                onChange={(e) => setNewProfilePassword(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="rounded-lg border border-accent/20 bg-accent/10 p-3 text-xs text-accent">
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
