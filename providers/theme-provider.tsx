import { getTrenaColors, type TrenaThemeMode } from '@/constants/theme';
import { ThemeContext } from '@/hooks/use-theme-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

const THEME_KEY = 'trena:themeMode';

function isThemeMode(v: unknown): v is TrenaThemeMode {
  return v === 'dark' || v === 'light' || v === 'mono-blue';
}

export default function TrenaThemeProvider({ children }: PropsWithChildren) {
  const [mode, setModeState] = useState<TrenaThemeMode>('dark');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_KEY);
        if (!isMounted) return;
        if (isThemeMode(stored)) {
          setModeState(stored);
        }
      } finally {
        if (isMounted) setIsReady(true);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const setMode = useCallback((next: TrenaThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const modes: TrenaThemeMode[] = ['dark', 'light', 'mono-blue'];
      const index = modes.indexOf(prev);
      const next = modes[(index + 1) % modes.length];
      AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const colors = useMemo(() => getTrenaColors(mode), [mode]);

  const value = useMemo(
    () => ({
      mode,
      colors,
      isReady,
      setMode,
      toggle,
    }),
    [colors, isReady, mode, setMode, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}


