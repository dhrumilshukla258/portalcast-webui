import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getChannelGroups } from '@/api/endpoints/channels';
import {
  getConfig,
  saveConfig,
  refreshGroups,
  refreshChannels,
  refreshMovieGroups,
  refreshSeriesGroups,
  clearServerCache,
} from '@/api/endpoints/admin';

export type Config = {
  hostname: string;
  port: string;
  contextPath: string;
  mac: string;
  deviceId1: string;
  deviceId2: string;
  serialNumber: string;
  stbType: string;
  groups: string[];
  proxy: boolean;
  tokens: string[];
  playCensored: boolean;
  providerType: 'stalker' | 'xtream';
  username?: string;
  password?: string;
};

export type Group = {
  title: string;
};

// Owns all Config-tab state and network handlers: loading/saving the
// provider config, the group-select list, the import-URL text parser, the
// four "refresh from provider" actions, and the two destructive confirm-
// modal flows (clear watched, clear server cache). ConfigTab.tsx itself is
// just the form markup wired to what this returns.
export function useConfigTabActions() {
  const [config, setConfig] = useState<Config>({
    hostname: '',
    port: '',
    contextPath: '',
    mac: '',
    deviceId1: '',
    deviceId2: '',
    serialNumber: '',
    stbType: '',
    groups: [],
    proxy: false,
    tokens: [],
    playCensored: false,
    providerType: 'stalker',
    username: '',
    password: '',
  });
  const [groups, setGroups] = useState<Group[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [loadingSeries, setLoadingSeries] = useState(false);

  const loadGroups = async (signal?: AbortSignal) => {
    try {
      const response = await getChannelGroups(true, signal);
      setGroups(response.data);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error('Error loading groups');
      }
    }
  };

  const loadConfig = async (signal?: AbortSignal) => {
    try {
      const data = await getConfig(signal) as Partial<Config>;
      setConfig((prev) => ({
        ...prev,
        ...data,
        groups: Array.isArray(data.groups) ? data.groups : [],
        proxy: !!data.proxy,
        playCensored: !!data.playCensored,
        tokens: Array.isArray(data.tokens) ? data.tokens : [],
        providerType: data.providerType || 'stalker',
      }));
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error('Error loading configuration');
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        await loadGroups(controller.signal);
        await loadConfig(controller.signal);
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error(error);
        }
      }
    })();
    return () => controller.abort();
  }, []);

  const handleImportClick = () => {
    setShowImportModal(true);
  };

  const handleModalClose = () => {
    setShowImportModal(false);
    setImportText('');
  };

  const handleParseAndApply = () => {
    const lines = importText.split('\n');
    const newConfig: Partial<Config> = {};
    lines.forEach((line) => {
      if (line.includes('http')) {
        try {
          const url = new URL(line.trim());
          newConfig.hostname = url.hostname;
          newConfig.port = url.port || '80';
          const pathSegments = url.pathname
            .split('/')
            .filter((segment) => segment !== '');
          newConfig.contextPath =
            pathSegments.length > 0 ? pathSegments[0] : '';
        } catch (error) {
          console.error('Invalid URL in import text:', error);
          toast.error('Invalid URL detected. Please check the input.');
        }
      } else if (line.toLowerCase().startsWith('mac-')) {
        newConfig.mac = line.substring(line.indexOf('-') + 1).trim();
      } else if (line.toLowerCase().startsWith('sn-')) {
        newConfig.serialNumber = line.substring(line.indexOf('-') + 1).trim();
      } else if (line.toLowerCase().startsWith('username=')) {
        newConfig.username = line.split('=')[1].trim();
      } else if (line.toLowerCase().startsWith('password=')) {
        newConfig.password = line.split('=')[1].trim();
      }
    });

    setConfig((prev) => ({ ...prev, ...newConfig }));
    toast.success('Configuration imported successfully!');
    handleModalClose();
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    setConfig((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? target.checked : value,
    }));
  };

  const handleGroupsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
    setConfig((prev) => ({ ...prev, groups: selected }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response = await saveConfig(config);
      toast.success(
        response.message || 'Configuration updated successfully'
      );
    } catch {
      toast.error('Error updating configuration');
    }
  };

  const handleReloadGroups = async () => {
    setLoadingGroups(true);
    try {
      await refreshGroups();
      toast.success('Groups refreshed successfully');
      await loadGroups();
    } catch {
      toast.error('Error refreshing groups');
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleRefreshChannels = async () => {
    setLoadingChannels(true);
    try {
      await refreshChannels();
      toast.success('Channels refreshed successfully');
    } catch {
      toast.error('Error refreshing channels');
    } finally {
      setLoadingChannels(false);
    }
  };

  const handleRefreshMovieGroups = async () => {
    setLoadingMovies(true);
    try {
      await refreshMovieGroups();
      toast.success('Movie groups refreshed successfully');
    } catch {
      toast.error('Error refreshing movie groups');
    } finally {
      setLoadingMovies(false);
    }
  };

  const handleRefreshSeriesGroups = async () => {
    setLoadingSeries(true);
    try {
      await refreshSeriesGroups();
      toast.success('Series groups refreshed successfully');
    } catch {
      toast.error('Error refreshing Series groups');
    } finally {
      setLoadingSeries(false);
    }
  };

  const handleClearWatched = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear History',
      message:
        'Are you sure you want to clear all watched and in-progress statuses?',
      isDestructive: true,
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('video-completed-')) {
            localStorage.removeItem(key);
          }
        });
        toast.success('All watched statuses have been cleared.');
      },
    });
  };

  const handleClearCache = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear Server Cache',
      message:
        'Are you sure you want to clear the server cache? This will force reload metadata from the IPTV provider.',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await clearServerCache();
          toast.success('Server cache cleared successfully.');
        } catch {
          toast.error('Failed to clear server cache.');
        }
      },
    });
  };

  return {
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
  };
}
