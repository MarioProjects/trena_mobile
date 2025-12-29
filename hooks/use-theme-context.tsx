import { TrenaDarkColors, type TrenaColorPalette, type TrenaThemeMode } from '@/constants/theme';
import { createContext, useContext } from 'react';

export type ThemeData = {
  mode: TrenaThemeMode;
  colors: TrenaColorPalette;
  isReady: boolean;
  setMode: (mode: TrenaThemeMode) => void;
  toggle: () => void;
};

export const ThemeContext = createContext<ThemeData>({
  mode: 'dark',
  colors: TrenaDarkColors,
  isReady: false,
  setMode: () => {},
  toggle: () => {},
});

export function useTrenaTheme() {
  return useContext(ThemeContext);
}


