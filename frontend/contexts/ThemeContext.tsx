'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    console.log('ThemeProvider mounted');
    // Read from localStorage
    const savedTheme = localStorage.getItem('theme') as Theme;
    console.log('Saved theme from localStorage:', savedTheme);
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      console.log('Using system dark mode preference');
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    console.log('Theme changed to:', theme);
    // Save to localStorage and update DOM
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      console.log('Adding dark class to document');
      document.documentElement.classList.add('dark');
    } else {
      console.log('Removing dark class from document');
      document.documentElement.classList.remove('dark');
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    console.log('toggleTheme called. Current theme:', theme);
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      console.log('Setting new theme:', newTheme);
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
