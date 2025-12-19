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
import { Asset } from 'expo-asset';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SvgUri } from 'react-native-svg';

import { TrenaColors } from '@/constants/theme';
import { useAuthContext } from '@/hooks/use-auth-context';
import AuthProvider from '@/providers/auth-provider';

// Prevent splash screen from auto-hiding until fonts are loaded
SplashScreen.preventAutoHideAsync();

const splashSvgUri = Asset.fromModule(
  require('../assets/images/splash-letter.svg')
).uri;

const SPLASH_LOGO_WIDTH = 180;
const SPLASH_LOGO_HEIGHT = 50;

function LoadingSplash() {
  return (
    <View style={styles.splashContainer}>
      <SvgUri
        uri={splashSvgUri}
        width={SPLASH_LOGO_WIDTH}
        height={SPLASH_LOGO_HEIGHT}
        color={TrenaColors.primary}
      />
      <StatusBar style="light" />
    </View>
  );
}

function AppNavigator() {
  const { isLoading } = useAuthContext();

  if (isLoading) {
    return <LoadingSplash />;
  }

  return (
    <>
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
    </>
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
    return <LoadingSplash />;
  }

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
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider value={navTheme}>
          <AppNavigator />
        </ThemeProvider>
      </GestureHandlerRootView>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: TrenaColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
