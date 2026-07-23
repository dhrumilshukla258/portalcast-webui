import React from 'react';
import { toast } from 'react-toastify';
import { Layout, RefreshCw } from 'lucide-react';
import type { Config, Group } from '@/hooks/useConfigTabActions';

interface LibrarySettingsFormProps {
  config: Config;
  groups: Group[];
  handleGroupsChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onReloadGroups: () => void;
  loadingGroups: boolean;
  onRefreshChannels: () => void;
  loadingChannels: boolean;
  onRefreshMovieGroups: () => void;
  loadingMovies: boolean;
  onRefreshSeriesGroups: () => void;
  loadingSeries: boolean;
}

// Content Library section — the right column of the Config tab's two-column
// layout: the group multi-select plus the four "refresh from provider"
// action buttons.
const LibrarySettingsForm: React.FC<LibrarySettingsFormProps> = ({
  config,
  groups,
  handleGroupsChange,
  onReloadGroups,
  loadingGroups,
  onRefreshChannels,
  loadingChannels,
  onRefreshMovieGroups,
  loadingMovies,
  onRefreshSeriesGroups,
  loadingSeries,
}) => {
  const actionButtons = [
    { label: 'Channels', action: onRefreshChannels, loading: loadingChannels },
    { label: 'Movies', action: onRefreshMovieGroups, loading: loadingMovies },
    { label: 'Series', action: onRefreshSeriesGroups, loading: loadingSeries },
    {
      label: 'Check Expiry',
      action: async () => {
        try {
          const { getExpiry } = await import('@/api/endpoints/epg');
          const response = await getExpiry();
          if (response.success && response.expiry) {
            toast.success(`Expires on: ${response.expiry}`);
          } else {
            toast.info('No expiry date found or unlimited.');
          }
        } catch {
          toast.error('Failed to check expiry.');
        }
      },
      loading: false,
      variant: 'success',
    },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-gray-800 bg-gray-900/30 p-6 backdrop-blur-md">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layout className="text-blue-500" size={20} />
            <h3 className="text-lg font-bold text-white">
              Content Library
            </h3>
          </div>
          <button
            type="button"
            onClick={onReloadGroups}
            disabled={loadingGroups}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:underline disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={loadingGroups ? 'animate-spin' : ''}
            />
            Sync Groups
          </button>
        </div>

        <select
          multiple
          className="scrollbar-hide h-56 w-full rounded-2xl border border-gray-800 bg-gray-950 p-4 text-sm outline-hidden focus:border-blue-500"
          value={config.groups}
          onChange={handleGroupsChange}
        >
          {groups.map((g) => (
            <option
              key={g.title}
              value={g.title}
              className="mb-1 rounded-lg p-2 checked:bg-blue-600"
            >
              {g.title}
            </option>
          ))}
        </select>
        <p className="ml-1 mt-2 text-[10px] text-gray-500">
          Hold Ctrl/Cmd to select multiple. {config.groups.length} selected.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {actionButtons.map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={btn.action}
              disabled={btn.loading}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black uppercase transition-all active:scale-95 disabled:opacity-50 ${
                btn.variant === 'success'
                  ? 'border border-green-900/50 bg-green-900/20 text-green-500 hover:bg-green-900/40'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {btn.loading && <RefreshCw size={12} className="animate-spin" />}
              {btn.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default LibrarySettingsForm;
