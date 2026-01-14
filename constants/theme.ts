/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

export type TrenaThemeMode = 'dark' | 'light' | 'mono-blue';

export const TrenaDarkColors = {
  background: 'rgb(26, 26, 26)',
  surface: 'rgb(42, 42, 42)',
  primary: 'rgb(163, 220, 64)',
  secondary: 'rgb(91, 79, 243)',
  text: 'rgb(236, 235, 228)',
  onSurface: 'rgb(236, 235, 228)',
  onPrimary: 'rgb(20, 20, 17)',
  onSecondary: 'rgb(236, 235, 228)',
  onTertiary: 'rgb(20, 20, 17)',
  // Fosfi accent colors
  tertiary: 'rgb(242, 137, 201)',
  accentRed: 'rgb(255, 67, 88)',
  custom: {
    cardFree: 'rgb(163, 220, 64)', // primary
    onCardFree: 'rgb(20, 20, 17)', // onPrimary
    cardTemplate: 'rgb(91, 79, 243)', // secondary
    onCardTemplate: 'rgb(236, 235, 228)', // onSecondary
    cardAI: 'rgb(242, 137, 201)', // tertiary
    onCardAI: 'rgb(20, 20, 17)', // onTertiary
  },
} as const;

export const TrenaLightColors = {
  background: 'rgb(236, 235, 228)',
  surface: 'rgb(255, 255, 255)',
  primary: 'rgb(166, 205, 49)',
  secondary: 'rgb(70, 62, 210)',
  text: 'rgb(20, 20, 17)',
  onSurface: 'rgb(20, 20, 17)',
  onPrimary: 'rgb(20, 20, 17)',
  onSecondary: 'rgb(236, 235, 228)',
  onTertiary: 'rgb(20, 20, 17)',
  // Fosfi accent colors
  tertiary: 'rgb(242, 137, 201)',
  accentRed: 'rgb(255, 67, 88)',
  custom: {
    cardFree: 'rgb(166, 205, 49)', // primary
    onCardFree: 'rgb(20, 20, 17)', // onPrimary
    cardTemplate: 'rgb(70, 62, 210)', // secondary
    onCardTemplate: 'rgb(236, 235, 228)', // onSecondary
    cardAI: 'rgb(242, 137, 201)', // tertiary
    onCardAI: 'rgb(20, 20, 17)', // onTertiary
  },
} as const;

export const TrenaMonoBlueColors = {
  background: 'rgb(255, 255, 255)', // #FFFFFF
  surface: 'rgb(245, 245, 247)',    // #F5F5F7
  primary: 'rgb(19, 68, 173)',      // #1344AD
  secondary: 'rgb(19, 68, 173)',    // Signature blue
  text: 'rgb(18, 18, 18)',         // #121212
  onSurface: 'rgb(18, 18, 18)',
  onPrimary: 'rgb(255, 255, 255)',
  onSecondary: 'rgb(255, 255, 255)',
  onTertiary: 'rgb(255, 255, 255)',
  tertiary: 'rgb(100, 100, 100)',
  accentRed: 'rgb(255, 67, 88)',
  custom: {
    cardFree: 'rgb(19, 68, 173)',      // primary
    onCardFree: 'rgb(255, 255, 255)',  // onPrimary
    cardTemplate: 'rgb(27, 27, 27)', // Pure White
    onCardTemplate: 'rgb(255, 255, 255)',  // Deep Black
    cardAI: 'rgb(234, 234, 234)',      // surface (Light Gray)
    onCardAI: 'rgb(18, 18, 18)',       // text
  },
} as const;

export type TrenaColorPalette = typeof TrenaDarkColors;

export function getTrenaColors(mode: TrenaThemeMode): TrenaColorPalette {
  switch (mode) {
    case 'light':
      return TrenaLightColors;
    case 'mono-blue':
      return TrenaMonoBlueColors;
    case 'dark':
    default:
      return TrenaDarkColors;
  }
}

/**
 * Returns an rgba(...) string from either `rgb(r,g,b)`, `rgba(r,g,b,a)` or `#RGB/#RRGGBB`.
 * Falls back to the input if parsing fails.
 */
export function rgba(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const c = color.trim();

  // rgb(...) / rgba(...)
  const rgbMatch = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+\s*)?\)$/i);
  if (rgbMatch) {
    const r = Number(rgbMatch[1]);
    const g = Number(rgbMatch[2]);
    const b = Number(rgbMatch[3]);
    if ([r, g, b].every((n) => Number.isFinite(n))) {
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  }

  // #RGB / #RRGGBB
  const hex = c.replace('#', '');
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  return color;
}

/* Inital vibrant Dark Theme
export const TrenaColors = {
  background: 'rgb(20, 20, 17)',
  surface: 'rgb(197, 195, 184)',
  primary: 'rgb(213, 255, 93)',
  secondary: 'rgb(59, 130, 246)',
  text: 'rgb(236, 235, 228)',
  // Fosfi accent colors
  tertiary: 'rgb(177, 92, 255)',
  accentRed: 'rgb(255, 67, 88)',
} as const;
 */

/**
 * Back-compat: existing screens/components historically import `TrenaColors`.
 * Prefer `useTrenaTheme().colors` for dynamic theme switching.
 */
export const TrenaColors = TrenaDarkColors;

// Back-compat alias (so imports like `Colors` won't immediately break during refactors).
export const Colors = TrenaColors;

/**
 * Font family constants for Work Sans typography.
 * Use these instead of fontWeight in StyleSheet for consistent cross-platform rendering.
 */
export const Fonts = {
  regular: 'WorkSans_400Regular',
  medium: 'WorkSans_500Medium',
  semiBold: 'WorkSans_600SemiBold',
  bold: 'WorkSans_700Bold',
  extraBold: 'WorkSans_800ExtraBold',
  black: 'WorkSans_900Black',
} as const;

/**
 * Shared shadow styles for cards and elevated elements.
 */
export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;
