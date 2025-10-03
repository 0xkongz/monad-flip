'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper function to set theme
function setTheme(theme: Theme) {
  localStorage.setItem('theme', theme);
  document.documentElement.className = theme;
  console.log('[setTheme] Set theme to:', theme, 'className:', document.documentElement.className);
}

// Helper function to keep theme on initial load
function keepTheme() {
  const theme = localStorage.getItem('theme') as Theme | null;
  if (theme) {
    document.documentElement.className = theme;
    console.log('[keepTheme] Restored theme:', theme);
    return theme;
  }
  // Default to light theme
  document.documentElement.className = 'light';
  console.log('[keepTheme] No saved theme, defaulting to light');
  return 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  // Initialize theme on mount
  useEffect(() => {
    const currentTheme = keepTheme();
    setThemeState(currentTheme);
  }, []);

  const toggleTheme = () => {
    console.log('[toggleTheme] Current theme:', theme);
    const newTheme: Theme = theme === 'light' ? 'dark' : 'light';
    console.log('[toggleTheme] Switching to:', newTheme);
    setTheme(newTheme);
    setThemeState(newTheme);
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
