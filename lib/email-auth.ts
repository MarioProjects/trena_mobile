import { supabase } from './supabase';

/**
 * Send an OTP (One-Time Password) email to the user.
 * The user will receive a 6-digit code to enter in the app.
 */
export async function sendOTP(
  email: string,
  options?: { shouldCreateUser?: boolean }
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      shouldCreateUser: options?.shouldCreateUser ?? true,
      // No emailRedirectTo - this tells Supabase to send OTP code instead of magic link
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Verify the OTP code entered by the user.
 * @param email - The email address the OTP was sent to
 * @param token - The 6-digit OTP code
 */
export async function verifyOTP(
  email: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
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
