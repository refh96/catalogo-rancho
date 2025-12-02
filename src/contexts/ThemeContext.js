'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ theme: 'system', toggleTheme: () => {}, setTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('system');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    if (theme === 'light') {
      root.dataset.theme = 'light';
    } else if (theme === 'dark') {
      root.dataset.theme = 'dark';
    } else {
      root.removeAttribute('data-theme');
    }

    if (typeof window !== 'undefined' && (theme === 'light' || theme === 'dark')) {
      window.localStorage.setItem('theme', theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  const setThemeExplicit = (value) => {
    if (value === 'light' || value === 'dark' || value === 'system') {
      setTheme(value);
    }
  };

  const value = {
    theme,
    toggleTheme,
    setTheme: setThemeExplicit,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
