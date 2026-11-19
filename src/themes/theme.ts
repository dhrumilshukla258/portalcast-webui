// The look of the web app, picked in the profile menu (ThemePicker): saved with the account
// (preferences.theme, accountTheme.ts) and on this device (localStorage, for the first frame).
// `html[data-theme]` carries it to CSS (src/themes/*/theme.css); components that look
// different per theme read it with useTheme().
import { useSyncExternalStore } from 'react';
import { isTvApp } from '@/utils/helpers';

/** Every theme, in the order the picker (ThemePicker.tsx) shows them. `swatch`: the few
 *  colours its preview card is drawn with (page, panel, text, accent). */
export const THEMES = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'Navy and blue, the original look.',
    swatch: { page: '#05080f', panel: '#121a2b', fg: '#ffffff', accent: '#00c6ff' },
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Black and glass, Apple TV style.',
    swatch: { page: '#000000', panel: '#1c1c1e', fg: '#ffffff', accent: '#f5f5f7' },
  },
  {
    id: 'console',
    label: 'Console',
    description: 'Midnight blue with an ice-blue focus ring.',
    swatch: { page: '#071121', panel: '#14243c', fg: '#f4f7ff', accent: '#90caff' },
  },
] as const;
export type ThemeId = (typeof THEMES)[number]['id'];

const KEY = 'theme';
const listeners = new Set<() => void>();
// The TV apps (Samsung, LG) draw their own screens (src/tv) with Classic's layout. There a
// theme gives only its colours and its focus (data-tv-theme, src/tv/tv.css): data-theme stays
// classic, so the web's page-wide rules (glass, squircles, springs) never reach an old TV browser.
const TV = isTvApp();

export const isThemeId = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v);

function stored(): ThemeId {
  try {
    const v = localStorage.getItem(KEY);
    return isThemeId(v) ? v : 'classic';
  } catch {
    return 'classic';
  }
}

function apply(id: ThemeId): void {
  document.documentElement.setAttribute('data-theme', TV ? 'classic' : id);
  if (TV) document.documentElement.setAttribute('data-tv-theme', id);
  // The browser's own bar (phones, the installed app) in the page's colour.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEMES.find((t) => t.id === id)!.swatch.page);
}

// This device's last choice draws the first frame (index.html sets it even before this
// runs, for the intro); the account's (accountTheme.ts) follows.
let current: ThemeId = stored();
apply(current);

export function setTheme(id: ThemeId): void {
  if (id === current) return;
  current = id;
  apply(id);
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* private mode: this visit only */
  }
  listeners.forEach((l) => l());
}

export const themeLabel = (id: ThemeId): string => THEMES.find((t) => t.id === id)?.label ?? id;

export function useTheme(): ThemeId {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => current,
  );
}
