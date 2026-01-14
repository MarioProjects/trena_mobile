import {
    useFonts,
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
    WorkSans_700Bold,
    WorkSans_800ExtraBold,
    WorkSans_900Black,
} from '@expo-google-fonts/work-sans';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SvgUri } from 'react-native-svg';

import { rgba } from '@/constants/theme';
import { useAuthContext } from '@/hooks/use-auth-context';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import { hasSupabaseConfig } from '@/lib/supabase';
import AuthProvider from '@/providers/auth-provider';
import SettingsProvider from '@/providers/settings-provider';
import TrenaThemeProvider from '@/providers/theme-provider';

// Prevent splash screen from auto-hiding until fonts are loaded
SplashScreen.preventAutoHideAsync();

const splashSvgUri = Image.resolveAssetSource(require('../assets/images/splash-letter.svg')).uri;

const SPLASH_LOGO_WIDTH = 240;
const SPLASH_LOGO_HEIGHT = 160;

function LoadingSplash() {
  const { colors, mode } = useTrenaTheme();
  return (
    <View style={[styles.splashContainer, { backgroundColor: colors.background }]}>
      <SvgUri
        uri={splashSvgUri}
        width={SPLASH_LOGO_WIDTH}
        height={SPLASH_LOGO_HEIGHT}
        color={colors.primary}
      />
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </View>
  );
}

function AppNavigator() {
  const { isLoading } = useAuthContext();
  const { colors, mode } = useTrenaTheme();

  if (isLoading) {
    return <LoadingSplash />;
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'none',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="connect" />
        <Stack.Screen name="get-started" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="home" />
        <Stack.Screen name="auth/callback" />
      </Stack>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

function RootLayoutWithProviders() {
  const { colors, mode } = useTrenaTheme();

  const navTheme = useMemo(() => {
    const base = mode === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        // Critical: prevents white background during swipe/transition frames.
        background: colors.background,
        card: colors.background,
        text: colors.text,
        primary: colors.primary,
        border: rgba(colors.text, 0.12),
      },
    } as const;
  }, [colors, mode]);

  if (!hasSupabaseConfig()) {
    return (
      <View style={[styles.configContainer, { backgroundColor: colors.background }]}>
        <SvgUri
          uri={splashSvgUri}
          width={SPLASH_LOGO_WIDTH}
          height={SPLASH_LOGO_HEIGHT}
          color={colors.primary}
        />
        <Text style={[styles.configTitle, { color: colors.text }]}>Build misconfigured</Text>
        <Text style={[styles.configBody, { color: rgba(colors.text, 0.78) }]}>
          Missing EXPO_PUBLIC_SUPABASE_URL and/or EXPO_PUBLIC_SUPABASE_ANON_KEY.
          {'\n\n'}
          Fix: add them as EAS Secrets (or build env vars) and rebuild.
        </Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <SettingsProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <NavigationThemeProvider value={navTheme}>
            <AppNavigator />
          </NavigationThemeProvider>
        </GestureHandlerRootView>
      </SettingsProvider>
    </AuthProvider>
  );
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

  const fontsReady = !!fontsLoaded || !!fontError;
  useEffect(() => {
    if (!fontsReady) return;
    (async () => {
      try {
        await SplashScreen.hideAsync();
      } catch {
        // no-op: can throw if already hidden
      }
    })();
  }, [fontsReady]);

  // While fonts are loading, show our in-app splash (native splash remains visible).
  if (!fontsReady) {
    return (
      <TrenaThemeProvider>
        <LoadingSplash />
      </TrenaThemeProvider>
    );
  }

  return (
    <TrenaThemeProvider>
      <RootLayoutWithProviders />
    </TrenaThemeProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  configContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  configTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  configBody: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 520,
  },
});
