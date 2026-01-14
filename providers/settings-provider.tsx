import { DEFAULT_SETTINGS, SettingsContext, type UserSettings } from '@/hooks/use-settings';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

const SETTINGS_KEY = 'trena:userSettings';

export default function SettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettingsState] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(SETTINGS_KEY);
        if (!isMounted) return;
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object') {
              setSettingsState((prev) => ({ ...prev, ...parsed }));
            }
          } catch (e) {
            console.error('Failed to parse settings', e);
          }
        }
      } catch (e) {
        console.error('Failed to load settings', e);
      } finally {
        if (isMounted) setIsReady(true);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const updateSetting = useCallback((key: keyof UserSettings, value: boolean) => {
    setSettingsState((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      settings,
      isReady,
      updateSetting,
    }),
    [settings, isReady, updateSetting]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
