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
    console.log('[ThemeContext] Theme changed to:', theme);

    // Update localStorage and DOM when theme changes
    localStorage.setItem('theme', theme);
    console.log('[ThemeContext] Saved to localStorage:', theme);

    const htmlElement = document.documentElement;
    console.log('[ThemeContext] Current classes before:', htmlElement.className);

    if (theme === 'dark') {
      htmlElement.classList.add('dark');
      htmlElement.style.colorScheme = 'dark';
      console.log('[ThemeContext] Added dark class');
    } else {
      htmlElement.classList.remove('dark');
      htmlElement.style.colorScheme = 'light';
      console.log('[ThemeContext] Removed dark class');
    }

    console.log('[ThemeContext] Current classes after:', htmlElement.className);
    console.log('[ThemeContext] Color scheme:', htmlElement.style.colorScheme);
  }, [theme]);

  const toggleTheme = () => {
    console.log('[ThemeContext] toggleTheme called, current theme:', theme);
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      console.log('[ThemeContext] Setting new theme:', newTheme);
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
