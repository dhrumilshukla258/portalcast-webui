import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { webPlatformAdapter } from '@/api/platform';
import type { User } from '@/api/types/user';
import {
  getUserProfile,
  loginWithCredentials as apiLoginWithCredentials,
  loginWithGoogle as apiLoginWithGoogle,
  updateUserPreferences,
  syncUserProgress,
} from '@/api/endpoints/auth';

export type { User };

const authStorage = webPlatformAdapter.storage;

interface AuthContextType {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  loading: boolean;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updatePreferences: (
    newPrefs: Partial<User['preferences']>
  ) => Promise<User['preferences']>;
  syncProgress: (
    mediaId: string,
    progress: number,
    completed: boolean
  ) => Promise<void>;
  isLoggedIn: boolean;
  refreshProfile: () => Promise<void>;

}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(() =>
    authStorage.get('auth_token')
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(() =>
    authStorage.get('refresh_token')
  );
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = authStorage.get('auth_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Dynamically load Google Sign-In SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    try {
      const profile = await getUserProfile();
      if (profile) {
        setUser(profile);
        authStorage.set('auth_user', JSON.stringify(profile));
      }
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
    }
  }, [token]);

  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        await refreshProfile();
      }
      setLoading(false);
    };
    initializeAuth();
  }, [token, refreshProfile]);

  const loginWithGoogle = async (idToken: string) => {
    try {
      // clientType is resolved once at adapter-construction time via
      // isTizenDevice() (see @/api/platform) rather than the previous
      // inline window.tizen/viewport heuristic. The wire value sent to the
      // server ('tv' | 'web') is preserved.
      const clientType = webPlatformAdapter.clientType === 'tizen' ? 'tv' : 'web';
      const data = await apiLoginWithGoogle(idToken, clientType);

      if (data) {
        const {
          accessToken,
          refreshToken: newRefreshToken,
          user: userData,
        } = data;
        setToken(accessToken);
        setRefreshToken(newRefreshToken);
        setUser(userData);

        authStorage.set('auth_token', accessToken);
        authStorage.set('refresh_token', newRefreshToken);
        authStorage.set('auth_user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      throw error;
    }
  };

  const loginWithCredentials = async (email: string, password: string) => {
    try {
      const clientType = webPlatformAdapter.clientType === 'tizen' ? 'tv' : 'web';
      const data = await apiLoginWithCredentials(email, password, clientType);

      if (data) {
        const {
          accessToken,
          refreshToken: newRefreshToken,
          user: userData,
        } = data;
        setToken(accessToken);
        setRefreshToken(newRefreshToken);
        setUser(userData);

        authStorage.set('auth_token', accessToken);
        authStorage.set('refresh_token', newRefreshToken);
        authStorage.set('auth_user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Credentials login failed:', error);
      throw error;
    }
  };

  const logout = useCallback(() => {
    setToken(null);
    setRefreshToken(null);
    setUser(null);

    authStorage.remove('auth_token');
    authStorage.remove('refresh_token');
    authStorage.remove('auth_user');

    window.location.hash = '/home';
  }, []);

  const updatePreferences = async (newPrefs: Partial<User['preferences']>) => {
    if (!token || !user) return {};
    try {
      const data = await updateUserPreferences(newPrefs);
      if (data?.preferences) {
        const updatedUser = {
          ...user,
          preferences: data.preferences,
        };
        setUser(updatedUser);
        authStorage.set('auth_user', JSON.stringify(updatedUser));
        return data.preferences;
      }
    } catch (error) {
      console.error('Failed to sync preferences:', error);
    }
    return user?.preferences || {};
  };

  const syncProgress = async (
    mediaId: string,
    progress: number,
    completed: boolean
  ) => {
    if (!token) return;
    try {
      await syncUserProgress(mediaId, progress, completed);
    } catch (error) {
      console.error('Failed to sync progress:', error);
    }
  };



  // Listen to token expiry event from API client
  useEffect(() => {
    const handleAuthExpired = () => {
      logout();
    };
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        token,
        refreshToken,
        user,
        loading,
        loginWithGoogle,
        loginWithCredentials,
        logout,
        updatePreferences,
        syncProgress,
        isLoggedIn: !!token,
        refreshProfile,

      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
