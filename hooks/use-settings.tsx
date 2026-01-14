import { createContext, useContext } from 'react';

export type UserSettings = {
  notifications: boolean;
  haptics: boolean;
};

export type SettingsData = {
  settings: UserSettings;
  isReady: boolean;
  updateSetting: (key: keyof UserSettings, value: boolean) => void;
};

export const DEFAULT_SETTINGS: UserSettings = {
  notifications: true,
  haptics: true,
};

export const SettingsContext = createContext<SettingsData>({
  settings: DEFAULT_SETTINGS,
  isReady: false,
  updateSetting: () => {},
});

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
