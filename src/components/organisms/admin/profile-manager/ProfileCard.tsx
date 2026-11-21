import type { ConfigProfile } from '@/hooks/useProfileManager';

interface ProfileCardProps {
  profile: ConfigProfile;
  onActivate: (profileId: number) => void;
  onDelete: (profile: ConfigProfile) => void;
  onToggleEnabled: (profile: ConfigProfile) => void;
  onDuplicate: (profile: ConfigProfile) => void;
  /** Opens the portal's title words (languages, tags, channel names). */
  onTitleWords: (profile: ConfigProfile) => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  onActivate,
  onDelete,
  onToggleEnabled,
  onDuplicate,
  onTitleWords,
}) => {
  return (
    <div
      data-focusable="true"
      className={`relative flex flex-col justify-between rounded-xl border p-5 shadow-lg backdrop-blur-md transition-all ${
        profile.isActive
          ? 'border-green-500 bg-green-900/10 ring-1 ring-green-500/50'
          : 'border-divider/50 bg-panel-raised/40 hover:bg-panel-hover/60'
      } ${!profile.isEnabled ? 'opacity-75 grayscale' : ''}`}
    >
      <div>
        <div className="flex items-start justify-between">
          <h3 className="truncate text-lg font-bold text-fg">
            {profile.name}
          </h3>
          {profile.isActive && (
            <span className="shrink-0 rounded-full border border-green-500/30 bg-green-500/20 px-2 py-0.5 text-xs font-bold text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)]">
              ACTIVE
            </span>
          )}
        </div>
        <p className="mt-2 line-clamp-2 min-h-[2.5em] text-sm text-fg-muted">
          {profile.description || 'No description provided.'}
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-sm bg-panel-hover/50 px-2 py-1 text-fg-soft backdrop-blur-xs">
            Type:{' '}
            <span className="uppercase text-accent">
              {profile.config.providerType || 'stalker'}
            </span>
          </span>
          <span className="rounded-sm bg-panel-hover/50 px-2 py-1 text-fg-soft backdrop-blur-xs">
            Host: <span className="text-accent">{profile.config.hostname}</span>
          </span>
          <span className="rounded-sm bg-panel-hover/50 px-2 py-1 text-fg-soft backdrop-blur-xs">
            Groups:{' '}
            <span className="text-accent">{profile.config.groups.length}</span>
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-divider/50 pt-4">
        {!profile.isActive && (
          <>
            <button
              onClick={() => onActivate(profile.id)}
              disabled={!profile.isEnabled}
              data-focusable="true"
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-green-900/20 hover:bg-green-500 active:scale-95 disabled:cursor-not-allowed disabled:bg-divider disabled:opacity-50"
            >
              Activate
            </button>
            <button
              onClick={() => onDelete(profile)}
              data-focusable="true"
              className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20 active:scale-95"
            >
              Delete
            </button>
          </>
        )}
        <button
          onClick={() => onToggleEnabled(profile)}
          disabled={profile.isActive}
          data-focusable="true"
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
            profile.isActive
              ? 'invisible'
              : 'border border-divider/30 bg-panel-hover/50 text-fg-soft hover:bg-panel-hover/80'
          }`}
        >
          {profile.isEnabled ? 'Disable' : 'Enable'}
        </button>
        <button
          onClick={() => onTitleWords(profile)}
          data-focusable="true"
          className="rounded-lg border border-divider/30 bg-panel-hover/50 px-3 py-1.5 text-xs font-bold text-fg-soft hover:bg-panel-hover/80 active:scale-95"
        >
          Title words
        </button>
        <button
          onClick={() => onDuplicate(profile)}
          data-focusable="true"
          className="rounded-lg border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent hover:bg-accent/20 active:scale-95"
        >
          Clone
        </button>
      </div>
    </div>
  );
};

export default ProfileCard;
