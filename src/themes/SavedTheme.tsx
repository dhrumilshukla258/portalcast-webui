import { useAccountTheme } from './accountTheme';

/** Applies the signed-in account's saved theme (accountTheme.ts). Mounted once, in main.tsx. */
export default function SavedTheme() {
  useAccountTheme();
  return null;
}
