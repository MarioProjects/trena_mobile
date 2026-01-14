import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const SETTINGS_KEY = 'trena:userSettings';

const isExpoGo = Constants.appOwnership === 'expo';

// Dynamic import to avoid crashes in Expo Go Android
function getNotificationsModule() {
  // SDK 53+ Android Expo Go doesn't support expo-notifications and will throw a blocking error overlay
  if (isExpoGo && Platform.OS === 'android') {
    return null;
  }
  try {
    return require('expo-notifications');
  } catch (e) {
    return null;
  }
}

const Notifications = getNotificationsModule();

export async function requestNotificationPermissions() {
  if (!Notifications) return false;
  // Android local notifications in Expo Go can be flaky or trigger push warnings
  if (isExpoGo && Platform.OS === 'android') {
    console.warn('Notifications might not work as expected in Expo Go on Android. Recommend using a Development Build.');
  }
  
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (e) {
    console.warn('Failed to request permissions:', e);
    return false;
  }
}

async function areNotificationsEnabled() {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.notifications !== false;
    }
  } catch (e) {
    console.error('Failed to check notification settings', e);
  }
  return true;
}

export async function scheduleWorkoutReminder(sessionId: string, title: string, date: Date, force = false) {
  if (!Notifications) return;

  // First cancel any existing reminder for this session
  await cancelWorkoutReminder(sessionId);

  if (!force && !(await areNotificationsEnabled())) {
    return;
  }

  const now = new Date();
  if (date <= now) {
    // Don't schedule for the past
    return;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: sessionId,
      content: {
        title: 'Workout Reminder',
        body: `It's time for your workout: ${title}`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: date,
    });
  } catch (e) {
    console.error('Failed to schedule notification', e);
  }
}

export async function cancelWorkoutReminder(sessionId: string) {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(sessionId);
  } catch (e) {
    console.error('Failed to cancel notification', e);
  }
}

export async function cancelAllReminders() {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.error('Failed to cancel all notifications', e);
  }
}
