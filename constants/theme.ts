/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

export const TrenaColors = {
  background: 'rgb(20, 20, 17)',
  surface: 'rgb(197, 195, 184)',
  primary: 'rgb(163, 220, 64)',
  secondary: 'rgb(91, 79, 243)',
  text: 'rgb(236, 235, 228)',
  // Fosfi accent colors
  accentPurple: 'rgb(242, 137, 201)',
  accentRed: 'rgb(255, 67, 88)',
} as const;

/* Inital vibrant Dark Theme
export const TrenaColors = {
  background: 'rgb(20, 20, 17)',
  surface: 'rgb(197, 195, 184)',
  primary: 'rgb(213, 255, 93)',
  secondary: 'rgb(59, 130, 246)',
  text: 'rgb(236, 235, 228)',
  // Fosfi accent colors
  accentPurple: 'rgb(177, 92, 255)',
  accentRed: 'rgb(255, 67, 88)',
} as const;
 */

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
