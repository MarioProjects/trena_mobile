import * as Haptics from 'expo-haptics';
import { useSettings } from './use-settings';

export function useHaptics() {
  const { settings } = useSettings();

  const selection = () => {
    if (settings?.haptics) {
      Haptics.selectionAsync().catch(() => {});
    }
  };

  const light = () => {
    if (settings?.haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const medium = () => {
    if (settings?.haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  };

  const heavy = () => {
    if (settings?.haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }
  };

  const success = () => {
    if (settings?.haptics) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  };

  const warning = () => {
    if (settings?.haptics) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
  };

  const error = () => {
    if (settings?.haptics) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  return {
    selection,
    light,
    medium,
    heavy,
    success,
    warning,
    error,
  };
}
