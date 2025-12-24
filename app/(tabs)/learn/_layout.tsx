import { Stack } from 'expo-router';
import React from 'react';
import { TrenaColors } from '@/constants/theme';

export default function LearnTabsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: TrenaColors.background },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
