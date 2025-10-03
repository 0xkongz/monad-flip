'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize with function to avoid calling during SSR
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  useEffect(() => {
    // Update localStorage and DOM when theme changes
    console.log('[ThemeContext] Theme changed to:', theme);
    localStorage.setItem('theme', theme);

    if (theme === 'dark') {
      console.log('[ThemeContext] Adding dark class');
      document.documentElement.classList.add('dark');
    } else {
      console.log('[ThemeContext] Removing dark class');
      document.documentElement.classList.remove('dark');
    }
    console.log('[ThemeContext] Final classes:', document.documentElement.className);
  }, [theme]);

  const toggleTheme = () => {
    console.log('[ThemeContext] toggleTheme called, current:', theme);
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      console.log('[ThemeContext] Changing from', prev, 'to', newTheme);
      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
