import * as Linking from 'expo-linking';
import { supabase } from './supabase';

/**
 * Send a magic link email to the user.
 * The user will receive an email with a link to sign in.
 */
export async function sendMagicLinkOrOTP(
  email: string,
  options?: { shouldCreateUser?: boolean }
): Promise<{ success: boolean; error?: string }> {
  const redirectTo = Linking.createURL('auth/callback');

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      shouldCreateUser: options?.shouldCreateUser ?? true,
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Verify a magic link token hash (used when user clicks the magic link).
 * This is for PKCE flow where the email template uses {{ .TokenHash }}.
 */
export async function verifyMagicLinkHash(
  tokenHash: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'email',
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data.session) {
    return { success: false, error: 'No session returned. Please try again.' };
  }

  return { success: true };
}
