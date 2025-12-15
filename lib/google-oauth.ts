import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

function extractParamFromUrl(url: string, key: string): string | undefined {
  const parsed = Linking.parse(url);
  const fromQuery =
    typeof parsed.queryParams?.[key] === 'string' ? (parsed.queryParams?.[key] as string) : undefined;
  if (fromQuery) return fromQuery;

  // Some environments may return params in the fragment (#...)
  const fragment = url.split('#')[1];
  if (!fragment) return undefined;
  const fragmentParams = new URLSearchParams(fragment);
  return fragmentParams.get(key) ?? undefined;
}

export async function signInWithGoogle() {
  const redirectTo = Linking.createURL('auth/callback');
  // eslint-disable-next-line no-console
  console.log('[auth] Google redirectTo:', redirectTo);

  // Web can just do a normal redirect-based OAuth flow.
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) throw error;
    return { type: 'redirect' as const };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      // We open the URL ourselves.
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error('Supabase did not return an OAuth URL.');
  // eslint-disable-next-line no-console
  console.log('[auth] Supabase OAuth URL:', data.url);

  // Prefer openAuthSessionAsync because it captures the final redirect URL (with `code`)
  // even in cases where the browser/OS drops query params for custom schemes.
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
    preferEphemeralSession: true,
  });
  const resultUrl = 'url' in result ? (result as any).url : undefined;
  // eslint-disable-next-line no-console
  console.log('[auth] openAuthSessionAsync result:', result.type, resultUrl ? '(url returned)' : '(no url)');

  if (result.type === 'success' && resultUrl) {
    const oauthError = extractParamFromUrl(resultUrl, 'error_description') ?? extractParamFromUrl(resultUrl, 'error');
    if (oauthError) throw new Error(oauthError);

    const code = extractParamFromUrl(resultUrl, 'code');
    if (code) {
      const exchanged = await supabase.auth.exchangeCodeForSession(code);
      if (exchanged.error) throw exchanged.error;
      return exchanged.data;
    }

    // Expo Go / custom-scheme redirects can return tokens in the fragment instead of a code.
    const access_token = extractParamFromUrl(resultUrl, 'access_token');
    const refresh_token = extractParamFromUrl(resultUrl, 'refresh_token');
    if (access_token && refresh_token) {
      const set = await supabase.auth.setSession({ access_token, refresh_token });
      if (set.error) throw set.error;
      return set.data;
    }

    throw new Error('No OAuth code or tokens were returned in the redirect URL.');
  }

  // Fallback: open the URL and let the deep link route handle it.
  await WebBrowser.openBrowserAsync(data.url);
  return { type: 'opened' as const };
}

