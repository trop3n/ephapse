import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';

export function useTheme() {
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
    } catch (err) {
      console.error('Theme error:', err);
    }
  }, [theme]);

  return theme;
}

export function useToggleTheme() {
  return useAppStore((state) => state.toggleTheme);
}
