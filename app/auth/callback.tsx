import { TrenaColors } from '@/constants/theme';
import { useAuthContext } from '@/hooks/use-auth-context';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

function getParamFromUrl(url: string, key: string): string | undefined {
  const parsed = Linking.parse(url);
  const fromQuery =
    typeof parsed.queryParams?.[key] === 'string' ? (parsed.queryParams?.[key] as string) : undefined;
  if (fromQuery) return fromQuery;
  const fragment = url.split('#')[1];
  if (!fragment) return undefined;
  const fragmentParams = new URLSearchParams(fragment);
  return fragmentParams.get(key) ?? undefined;
}

export default function AuthCallbackScreen() {
  const { isLoggedIn } = useAuthContext();
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();
  const url = Linking.useURL();
  const [message, setMessage] = useState('Completing sign-in…');
  const code = params.code;
  const error = params.error;
  const error_description = params.error_description;

  useEffect(() => {
    const run = async () => {
      const errorFromUrl = url
        ? (getParamFromUrl(url, 'error_description') ?? getParamFromUrl(url, 'error'))
        : undefined;
      const errorValue = error_description ?? error ?? errorFromUrl;

      if (errorValue) {
        setMessage(`Auth error: ${errorValue}`);
        return;
      }

      const codeFromUrl = url ? getParamFromUrl(url, 'code') : undefined;
      const codeValue = code ?? codeFromUrl;
      if (!codeValue) {
        setMessage('Missing OAuth code. You can go back and try again.');
        return;
      }

      const exchanged = await supabase.auth.exchangeCodeForSession(codeValue);
      if (exchanged.error) {
        setMessage(`Auth error: ${exchanged.error.message}`);
        return;
      }

      router.replace('/today');
    };

    run().catch((e: unknown) => {
      setMessage(e instanceof Error ? `Auth error: ${e.message}` : 'Auth error: Unknown error');
    });
  }, [code, error, error_description, url]);

  if (isLoggedIn) {
    return <Redirect href="/today" />;
  }

  return (
    <View style={styles.root}>
      <ActivityIndicator color={TrenaColors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: TrenaColors.background,
    paddingHorizontal: 24,
  },
  text: {
    color: 'rgba(236, 235, 228, 0.85)',
    textAlign: 'center',
  },
});
