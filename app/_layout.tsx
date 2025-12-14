import {
  useFonts,
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
  WorkSans_700Bold,
  WorkSans_800ExtraBold,
  WorkSans_900Black,
} from '@expo-google-fonts/work-sans';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { TrenaColors } from '@/constants/theme';
import { useAuthContext } from '@/hooks/use-auth-context';
import AuthProvider from '@/providers/auth-provider';

// Prevent splash screen from auto-hiding until fonts are loaded
SplashScreen.preventAutoHideAsync();

function SplashGate({ fontsReady }: { fontsReady: boolean }) {
  const { isLoading } = useAuthContext();

  useEffect(() => {
    if (fontsReady && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsReady, isLoading]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
    WorkSans_700Bold,
    WorkSans_800ExtraBold,
    WorkSans_900Black,
  });

  // Wait for fonts to load before rendering
  if (!fontsLoaded && !fontError) {
    return null;
  }

  const fontsReady = !!fontsLoaded || !!fontError;
  const navTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      // Critical: prevents white background during swipe/transition frames.
      background: TrenaColors.background,
      card: TrenaColors.background,
      text: TrenaColors.text,
      primary: TrenaColors.primary,
      border: 'rgba(236, 235, 228, 0.12)',
    },
  } as const;

  return (
    <AuthProvider>
      <ThemeProvider value={navTheme}>
        <SplashGate fontsReady={fontsReady} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: TrenaColors.background },
            animation: 'none',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="get-started" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="home" />
          <Stack.Screen name="auth/callback" />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </AuthProvider>
  );
}
