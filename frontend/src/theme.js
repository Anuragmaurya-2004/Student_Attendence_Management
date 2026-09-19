import { useSyncExternalStore } from 'react';

const THEME_KEY = 'theme';
const listeners = new Set();

const getPreferredDark = () => {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) return saved === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

let currentTheme = getPreferredDark();

const applyTheme = (nextTheme) => {
  if (typeof document === 'undefined') return;
  currentTheme = Boolean(nextTheme);
  document.documentElement.classList.toggle('dark', currentTheme);
  document.documentElement.style.colorScheme = currentTheme ? 'dark' : 'light';
  localStorage.setItem(THEME_KEY, currentTheme ? 'dark' : 'light');
  listeners.forEach((listener) => listener(currentTheme));
};

export function getTheme() {
  return currentTheme;
}

export function setTheme(nextTheme) {
  applyTheme(nextTheme);
}

export function toggleTheme() {
  applyTheme(!currentTheme);
}

export function useTheme() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => currentTheme,
    () => false,
  );
}
