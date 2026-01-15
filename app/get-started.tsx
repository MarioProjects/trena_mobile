import { Redirect, router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChevronLeftIcon, GoogleIcon } from '@/components/icons';
import { TrenaLogo } from '@/components/TrenaLogo';
import { ActionSheet, ActionSheetOption } from '@/components/ui/ActionSheet';
import { Fonts, rgba } from '@/constants/theme';
import { useAuthContext } from '@/hooks/use-auth-context';
import { useHaptics } from '@/hooks/use-haptics';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import { sendMagicLinkOrOTP } from '@/lib/email-auth';
import { signInWithGoogle } from '@/lib/google-oauth';

function isProbablyEmail(email: string) {
  const v = email.trim();
  return v.length >= 5 && v.includes('@') && v.includes('.');
}

export default function GetStartedScreen() {
  const { isLoggedIn, signInDemo } = useAuthContext();
  const haptics = useHaptics();
  const [email, setEmail] = useState('');
  const [showError, setShowError] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { colors } = useTrenaTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [actionSheetConfig, setActionSheetConfig] = useState<{
    title?: string;
    message?: string;
    options: ActionSheetOption[];
  }>({ options: [] });

  const showActionSheet = (config: { title?: string; message?: string; options: ActionSheetOption[] }) => {
    setActionSheetConfig(config);
    setActionSheetVisible(true);
  };

  const canSendMagicLink = useMemo(() => isProbablyEmail(email) && !isSending, [email, isSending]);

  const onGoogle = async () => {
    haptics.light();
    try {
      await signInWithGoogle();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Google sign-in failed.';
      showActionSheet({
        title: 'Sign-in error',
        message,
        options: [{ text: 'OK', onPress: () => {} }],
      });
    }
  };

  const onLogin = async () => {
    haptics.light();
    if (email.trim().toLowerCase() === 'test@google.com') {
      await signInDemo();
      return;
    }
    if (!isProbablyEmail(email)) {
      setShowError(true);
      return;
    }
    setShowError(false);
    setIsSending(true);

    const result = await sendMagicLinkOrOTP(email);

    setIsSending(false);

    if (result.success) {
      Keyboard.dismiss();
      showActionSheet({
        title: 'Check your email',
        message: `We sent a magic link to ${email.trim().toLowerCase()}. Click the link in your email to sign in.`,
        options: [{ text: 'Got it', onPress: () => {} }],
      });
    } else {
      showActionSheet({
        title: 'Sign-in error',
        message: result.error ?? 'Failed to send verification email. Please try again.',
        options: [{ text: 'OK', onPress: () => {} }],
      });
    }
  };

  const onEmailChange = (text: string) => {
    setEmail(text);
    if (showError) {
      setShowError(false);
    }
  };

  if (isLoggedIn) {
    return <Redirect href="/today" />;
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => {
              haptics.selection();
              router.back();
            }}
            hitSlop={16}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}>
            <ChevronLeftIcon size={36} color={colors.primary} strokeWidth={2} />
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <TrenaLogo width={180} height={50} color={colors.primary} />
            <Text style={styles.subtitle}>This is where your journey begins</Text>
          </View>

          {/* Email Login Section */}
          <View style={styles.loginSection}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={onEmailChange}
              placeholder="you@example.com"
              placeholderTextColor={rgba(colors.text, 0.4)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              style={[styles.input, showError && styles.inputError]}
            />
            {showError && (
              <Text style={styles.errorText}>Enter a valid email address</Text>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={onLogin}
              disabled={isSending}
              style={({ pressed }) => [
                styles.loginButton,
                !canSendMagicLink && styles.loginButtonDisabled,
                pressed && canSendMagicLink && styles.pressed,
              ]}>
              {isSending ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </Pressable>
            <Text style={styles.emailHint}>We'll send a magic link to your inbox</Text>
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or Login With</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Buttons */}
          <View style={styles.socialButtons}>
            <Pressable
              accessibilityRole="button"
              onPress={onGoogle}
              style={({ pressed }) => [styles.socialButton, styles.buttonGoogle, pressed && styles.pressed]}>
              <GoogleIcon size={22} color="#000" />
              <Text style={styles.socialButtonText}>Connect with Google</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
      <ActionSheet
        visible={actionSheetVisible}
        title={actionSheetConfig.title}
        message={actionSheetConfig.message}
        options={actionSheetConfig.options}
        onClose={() => setActionSheetVisible(false)}
      />
    </View>
  );
}

const createStyles = (colors: { background: string; primary: string; text: string; accentRed: string; onPrimary: string }) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safe: {
      flex: 1,
    },
    container: {
      flex: 1,
      paddingHorizontal: 24,
      paddingVertical: 32,
      justifyContent: 'center',
      gap: 24,
    },
    backButton: {
      position: 'absolute',
      top: 8,
      left: 8,
      padding: 8,
      zIndex: 10,
    },
    backButtonPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    header: {
      alignItems: 'center',
      gap: 10,
      marginBottom: 16,
    },
    subtitle: {
      color: rgba(colors.text, 0.8),
      fontSize: 14,
      lineHeight: 20,
      fontFamily: Fonts.semiBold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      textAlign: 'center',
    },
    loginSection: {
      gap: 12,
    },
    label: {
      color: rgba(colors.text, 0.9),
      fontSize: 16,
      fontFamily: Fonts.semiBold,
      marginLeft: 4,
    },
    input: {
      backgroundColor: rgba(colors.text, 0.08),
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: rgba(colors.text, 0.95),
      fontFamily: Fonts.regular,
      fontSize: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: rgba(colors.text, 0.15),
    },
    inputError: {
      borderColor: colors.accentRed,
      borderWidth: 1,
    },
    errorText: {
      color: colors.accentRed,
      fontSize: 12,
      fontFamily: Fonts.regular,
      marginLeft: 4,
      marginTop: -4,
    },
    loginButton: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 4,
    },
    loginButtonDisabled: {
      opacity: 0.5,
    },
    loginButtonText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontFamily: Fonts.black,
      letterSpacing: 0.3,
    },
    emailHint: {
      color: rgba(colors.text, 0.5),
      textAlign: 'center',
      fontSize: 13,
      fontFamily: Fonts.regular,
      marginTop: 4,
    },
    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginVertical: 8,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: rgba(colors.text, 0.25),
    },
    dividerText: {
      color: rgba(colors.text, 0.6),
      fontSize: 13,
      fontFamily: Fonts.semiBold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    socialButtons: {
      gap: 12,
    },
    socialButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderRadius: 14,
      paddingVertical: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(0, 0, 0, 0.1)',
    },
    buttonGoogle: {
      backgroundColor: '#fff',
    },
    socialButtonText: {
      color: '#000',
      fontSize: 15,
      fontFamily: Fonts.bold,
    },
    pressed: {
      transform: [{ scale: 0.98 }],
      opacity: 0.9,
    },
  });
