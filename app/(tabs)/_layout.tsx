import { ActivitiesIcon, LearnIcon, ProfileIcon, TodayIcon } from '@/components/icons';
import { TrenaColors } from '@/constants/theme';
import { useAuthContext } from '@/hooks/use-auth-context';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const { isLoading, isLoggedIn } = useAuthContext();
  const insets = useSafeAreaInsets();

  // Avoid flashing the tabs while auth is loading.
  if (isLoading) return null;

  // Protect the entire tabs area behind auth.
  if (!isLoggedIn) {
    return <Redirect href="/" />;
  }

  const bottomPad = Math.max(insets.bottom, 18);
  const barHeight = 56 + bottomPad;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: TrenaColors.primary,
        tabBarInactiveTintColor: 'rgba(236, 235, 228, 0.65)',
        tabBarStyle: {
          backgroundColor: TrenaColors.background,
          borderTopColor: 'rgba(236, 235, 228, 0.12)',
          height: barHeight,
          paddingBottom: bottomPad,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => (
            <TodayIcon color={color} size={typeof size === 'number' ? size : 24} />
          ),
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: 'Activities',
          tabBarIcon: ({ color, size }) => (
            <ActivitiesIcon color={color} size={typeof size === 'number' ? size : 24} />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarIcon: ({ color, size }) => (
            <LearnIcon color={color} size={typeof size === 'number' ? size : 24} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <ProfileIcon color={color} size={typeof size === 'number' ? size : 24} />
          ),
        }}
      />
    </Tabs>
  );
}

