/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';
import {
  getProfiles,
  activateProfile,
  setProfileEnabled,
  deleteProfile,
  createProfile,
} from '@/api/endpoints/profiles';
import { getConfig } from '@/api/endpoints/admin';

export type ConfigProfile = {
  id: number;
  name: string;
  description?: string;
  config: {
    hostname: string;
    port: string | number;
    contextPath: string;
    mac: string;
    deviceId1?: string;
    deviceId2?: string;
    serialNumber?: string;
    stbType: string;
    groups: string[];
    proxy: boolean;
    tokens: string[];
    playCensored: boolean;
    providerType?: 'stalker' | 'xtream';
    username?: string;
    password?: string;
  };
  isActive: boolean;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  isDestructive?: boolean;
  showInput?: boolean;
  inputValue?: string;
  inputPlaceholder?: string;
  onInputChange?: (val: string) => void;
}

export function useProfileManager() {
  const [profiles, setProfiles] = useState<ConfigProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDescription, setNewProfileDescription] = useState('');
  const [newProfileProviderType, setNewProfileProviderType] = useState<
    'stalker' | 'xtream'
  >('stalker');

  const duplicateNameRef = useRef('');
  const [newProfileUsername, setNewProfileUsername] = useState('');
  const [newProfilePassword, setNewProfilePassword] = useState('');

  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    showInput: false,
    inputValue: '',
  });

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const data = await getProfiles();
      setProfiles(data);
    } catch (error) {
      toast.error('Failed to load profiles');
      console.error('Error loading profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateProfile = async (profileId: number) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;

    const performActivation = async () => {
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      try {
        await activateProfile(profileId);
        toast.success('Profile activated! Server is restarting...');
        setTimeout(() => {
          loadProfiles();
        }, 2000);
      } catch (error) {
        toast.error('Failed to activate profile');
        console.error('Error activating profile:', error);
      }
    };

    setConfirmModal({
      isOpen: true,
      title: 'Activate Profile',
      message: 'Activating this profile will restart the server. Continue?',
      onConfirm: performActivation,
      isDestructive: false,
    });
  };

  const handleToggleEnabled = async (profile: ConfigProfile) => {
    try {
      await setProfileEnabled(profile.id, !profile.isEnabled);
      toast.success(`Profile ${profile.isEnabled ? 'disabled' : 'enabled'}`);
      loadProfiles();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
      console.error('Error toggling profile:', error);
    }
  };

  const handleDeleteProfile = async (profile: ConfigProfile) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Profile',
      message: `Are you sure you want to delete "${profile.name}"? This action cannot be undone.`,
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await deleteProfile(profile.id);
          toast.success('Profile deleted');
          loadProfiles();
        } catch (error: any) {
          toast.error(
            error.response?.data?.error || 'Failed to delete profile'
          );
          console.error('Error deleting profile:', error);
        }
      },
    });
  };

  const handleCreateProfile = async () => {
    const safeName = newProfileName.trim();

    if (!safeName) {
      toast.error('Profile name is required');
      return;
    }

    try {
      const currentConfig = (await getConfig()) as ConfigProfile['config'];

      const newConfig = {
        ...currentConfig,
        providerType: newProfileProviderType,
        username:
          newProfileProviderType === 'xtream'
            ? newProfileUsername
            : currentConfig.username,
        password:
          newProfileProviderType === 'xtream'
            ? newProfilePassword
            : currentConfig.password,
      };

      await createProfile({
        name: safeName,
        description: newProfileDescription,
        config: newConfig,
      });
      toast.success('Profile created successfully');
      setShowCreateModal(false);
      setNewProfileName('');
      setNewProfileDescription('');
      setNewProfileProviderType('stalker');
      setNewProfileUsername('');
      setNewProfilePassword('');
      loadProfiles();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create profile');
    }
  };

  const handleDuplicateProfile = async (profile: ConfigProfile) => {
    const initialName = `${profile.name} (Copy)`;
    duplicateNameRef.current = initialName;

    setConfirmModal({
      isOpen: true,
      title: 'Duplicate Profile',
      message: 'Enter a name for the new profile:',
      showInput: true,
      inputValue: initialName,
      inputPlaceholder: 'New Profile Name',
      onInputChange: (val) => {
        duplicateNameRef.current = val;
        setConfirmModal((prev) => ({ ...prev, inputValue: val }));
      },
      onConfirm: async () => {
        const safeName = duplicateNameRef.current.trim();
        if (!safeName) return;

        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await createProfile({
            name: safeName,
            description: profile.description,
            config: profile.config,
          });
          toast.success('Profile duplicated successfully');
          loadProfiles();
        } catch (error: any) {
          toast.error(
            error.response?.data?.error || 'Failed to duplicate profile'
          );
        }
      },
      isDestructive: false,
    });
  };

  return {
    profiles,
    loading,
    showCreateModal,
    setShowCreateModal,
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
    confirmModal,
    setConfirmModal,
    handleActivateProfile,
    handleToggleEnabled,
    handleDeleteProfile,
    handleCreateProfile,
    handleDuplicateProfile,
  };
}
