import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

export type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const { user } = useAuthStore();
  const theme = (user?.settings?.theme as Theme) || 'light';

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement;
    
    if (theme === 'system') {
      // Let CSS handle it with media query
      root.setAttribute('data-theme', 'system');
    } else {
      root.setAttribute('data-theme', theme);
    }
    
    // Also update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
          ? '#1A1A2E'
          : '#FDFCFA'
      );
    }
  }, [theme]);

  return { theme };
}

// Hook to detect system preference
export function useSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
