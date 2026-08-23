import { useColorScheme as useRNColorScheme } from 'react-native';
import { useSettingsStore } from '@/stores/settingsStore';

// Reads the user's preferred theme from settingsStore.
// Falls back to the system scheme (or dark) if settings aren't loaded yet.
export function useColorScheme(): 'light' | 'dark' {
  const theme  = useSettingsStore((s) => s.settings?.theme);
  const system = useRNColorScheme();

  if (!theme || theme === 'system') return (system === 'light' ? 'light' : 'dark');
  return theme;
}
