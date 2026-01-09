import { ActivitiesIcon, EnergyIcon, LearnIcon, ProfileIcon, TodayIcon } from '@/components/icons';
import { useAuthContext } from '@/hooks/use-auth-context';
import { rgba } from '@/constants/theme';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import { Redirect, router, Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const { isLoading, isLoggedIn } = useAuthContext();
  const { colors } = useTrenaTheme();
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
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: rgba(colors.text, 0.65),
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: rgba(colors.text, 0.12),
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
              <EnergyIcon color={color} size={typeof size === 'number' ? size : 24} />
            ),
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: 'Stats',
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
          listeners={{
            tabPress: (_e) => {
              // When the Learn tab is pressed, force it to navigate to the index route.
              // This prevents the "sticky" exercise detail screen issue.
              router.replace('/learn');
            },
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
    </>
  );
}

