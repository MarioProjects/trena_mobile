import { ChevronLeftIcon } from '@/components/icons';
import { Fonts } from '@/constants/theme';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import { Stack, router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

export default function LearnLayout() {
  const { colors } = useTrenaTheme();
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: Fonts.bold },
        headerShadowVisible: false,
        // We'll render our own chevron (like get-started), so hide the default back.
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
      {/* The Learn home screen already renders its own large title */}
      <Stack.Screen name="index" options={{ headerShown: false }} />

      {/* Redirect-only route (no UI/header) */}
      <Stack.Screen name="[id]" options={{ headerShown: false }} />

      {/* Detail routes */}
      <Stack.Screen
        name="method/[id]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="exercise/[id]"
        options={{
          headerShown: false,
        }}
      />
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
