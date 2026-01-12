import { useAuthContext } from '@/hooks/use-auth-context';
import { rgba } from '@/constants/theme';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import { verifyMagicLinkHash } from '@/lib/email-auth';
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
  const { colors } = useTrenaTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{
    code?: string;
    token_hash?: string;
    type?: string;
    error?: string;
    error_description?: string;
  }>();
  const url = Linking.useURL();
  const [message, setMessage] = useState('Completing sign-in…');
  const code = params.code;
  const token_hash = params.token_hash;
  const type = params.type;
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

      // Handle magic link with token_hash (PKCE flow)
      const tokenHashFromUrl = url ? getParamFromUrl(url, 'token_hash') : undefined;
      const tokenHashValue = token_hash ?? tokenHashFromUrl;
      const typeFromUrl = url ? getParamFromUrl(url, 'type') : undefined;
      const typeValue = type ?? typeFromUrl;

      if (tokenHashValue && typeValue === 'email') {
        const result = await verifyMagicLinkHash(tokenHashValue);
        if (result.success) {
          router.replace('/today');
          return;
        }
        setMessage(`Auth error: ${result.error ?? 'Magic link verification failed.'}`);
        return;
      }

      // Handle OAuth code exchange
      const codeFromUrl = url ? getParamFromUrl(url, 'code') : undefined;
      const codeValue = code ?? codeFromUrl;
      if (!codeValue && !tokenHashValue) {
        setMessage('Missing authentication data. You can go back and try again.');
        return;
      }

      if (codeValue) {
        const exchanged = await supabase.auth.exchangeCodeForSession(codeValue);
        if (exchanged.error) {
          setMessage(`Auth error: ${exchanged.error.message}`);
          return;
        }

        router.replace('/today');
      }
    };

    run().catch((e: unknown) => {
      setMessage(e instanceof Error ? `Auth error: ${e.message}` : 'Auth error: Unknown error');
    });
  }, [code, token_hash, type, error, error_description, url]);

  if (isLoggedIn) {
    return <Redirect href="/today" />;
  }

  return (
    <View style={styles.root}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const createStyles = (colors: { background: string; text: string }) =>
  StyleSheet.create({
    root: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      backgroundColor: colors.background,
      paddingHorizontal: 24,
    },
    text: {
      color: rgba(colors.text, 0.85),
      textAlign: 'center',
    },
  });
