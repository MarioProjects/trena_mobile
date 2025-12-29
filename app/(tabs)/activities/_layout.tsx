import { ChevronLeftIcon } from '@/components/icons';
import { Fonts } from '@/constants/theme';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import { Stack, router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

export default function ActivitiesLayout() {
  const { colors } = useTrenaTheme();
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: Fonts.bold },
        headerShadowVisible: false,
        headerBackVisible: false,
        headerLeft: () => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            hitSlop={16}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          >
            <ChevronLeftIcon size={34} color={colors.primary} strokeWidth={2} />
          </Pressable>
        ),
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="start" options={{ title: 'Start workout' }} />
      <Stack.Screen name="templates" options={{ title: 'Templates' }} />
      <Stack.Screen name="programs" options={{ title: 'Programs' }} />
      <Stack.Screen name="methods/bilbo/create" options={{ title: 'Create Bilbo' }} />
      <Stack.Screen name="methods/wendler_531/create" options={{ title: 'Create 5/3/1' }} />
      <Stack.Screen name="session/[id]" options={{ title: 'Workout' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  backButton: {
    padding: 8,
  },
  backButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
