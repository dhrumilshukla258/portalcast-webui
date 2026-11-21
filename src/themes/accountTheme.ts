// The theme saved with the account (preferences.theme on the server) follows the viewer to
// every device: applied when the account loads, saved when a theme is picked. Servers that do
// not keep it yet (before it was added to their preferences allowlist) drop the key, and the
// device's own choice (theme.ts) stays.
import { useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { isThemeId, setTheme, type ThemeId } from './theme';

/** Applies the signed-in account's saved theme. Mounted once (main.tsx). */
export function useAccountTheme(): void {
  const { user } = useAuth();
  const saved = user?.preferences?.theme;
  useEffect(() => {
    if (isThemeId(saved)) setTheme(saved);
  }, [saved]);
}

/** Picks a theme: shown at once, kept on this device and saved to the account. */
export function useChooseTheme(): (id: ThemeId) => void {
  const { user, updatePreferences } = useAuth();
  return useCallback(
    (id: ThemeId) => {
      setTheme(id);
      if (user) void updatePreferences({ theme: id });
    },
    [user, updatePreferences],
  );
}
