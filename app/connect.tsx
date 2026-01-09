import NetInfo, { useNetInfo } from '@react-native-community/netinfo';
import { Redirect, router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TrenaLogo } from '@/components/TrenaLogo';
import { Fonts, rgba } from '@/constants/theme';
import { useAuthContext } from '@/hooks/use-auth-context';
import { useTrenaTheme } from '@/hooks/use-theme-context';

export default function ConnectScreen() {
  const { isLoading, isLoggedIn } = useAuthContext();
  const netinfo = useNetInfo();
  const { colors } = useTrenaTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!isLoading && isLoggedIn) {
    return <Redirect href="/today" />;
  }

  const offline = netinfo.isConnected === false;

  const onContinue = async () => {
    const s = await NetInfo.fetch();
    if (s.isConnected) router.replace('/get-started');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TrenaLogo width={220} height={60} color={colors.primary} />

        <View style={styles.card}>
          <Text style={styles.title}>Connect to the internet</Text>
          <Text style={styles.body}>
            You need an internet connection to sign in the first time.
          </Text>
          <Text style={styles.body}>
            Once you’ve signed in, you can use the app offline.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: offline }}
            accessibilityHint={
              offline
                ? 'Disabled. Connect to the internet to continue and sign in for the first time.'
                : 'Continues to sign in.'
            }
            disabled={offline}
            onPress={onContinue}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.primary },
              offline && styles.buttonDisabled,
              pressed && !offline && styles.pressed,
            ]}
          >
            <Text style={styles.buttonText}>{offline ? 'Waiting for connection…' : 'Continue to sign in'}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: { background: string; primary: string; text: string; onPrimary: string }) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: {
      flex: 1,
      paddingHorizontal: 24,
      paddingVertical: 24,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 18,
    },
    card: {
      width: '100%',
      maxWidth: 520,
      backgroundColor: rgba(colors.text, 0.08),
      borderRadius: 18,
      padding: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: rgba(colors.text, 0.12),
      gap: 10,
    },
    title: {
      color: colors.text,
      fontSize: 18,
      fontFamily: Fonts.extraBold,
    },
    body: {
      color: rgba(colors.text, 0.8),
      fontSize: 14,
      lineHeight: 20,
      fontFamily: Fonts.regular,
    },
    button: {
      marginTop: 6,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: rgba(colors.text, 0.12),
    },
    buttonDisabled: {
      opacity: 0.55,
    },
    buttonText: {
      color: colors.onPrimary,
      fontSize: 15,
      fontFamily: Fonts.black,
      letterSpacing: 0.2,
    },
    pressed: {
      transform: [{ scale: 0.99 }],
      opacity: 0.96,
    },
  });

