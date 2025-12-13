import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FacebookIcon } from '@/components/FacebookIcon';
import { GoogleIcon } from '@/components/GoogleIcon';
import { TrenaLogo } from '@/components/TrenaLogo';
import { Fonts, TrenaColors } from '@/constants/theme';

function isProbablyEmail(email: string) {
  const v = email.trim();
  return v.length >= 5 && v.includes('@') && v.includes('.');
}

export default function GetStartedScreen() {
  const [email, setEmail] = useState('');
  const [showError, setShowError] = useState(false);

  const canSendMagicLink = useMemo(() => isProbablyEmail(email), [email]);

  const goHome = () => router.replace('/home');

  const onGoogle = () => goHome();
  const onFacebook = () => goHome();

  const onLogin = () => {
    if (!canSendMagicLink) {
      setShowError(true);
      return;
    }
    setShowError(false);
    // TODO: Send magic link to email
    goHome();
  };

  const onEmailChange = (text: string) => {
    setEmail(text);
    if (showError) {
      setShowError(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TrenaLogo width={180} height={50} color="rgba(236, 235, 228, 0.95)" />
            <Text style={styles.subtitle}>This is where your journey begins</Text>
          </View>

          {/* Email Login Section */}
          <View style={styles.loginSection}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={onEmailChange}
              placeholder="you@example.com"
              placeholderTextColor="rgba(236, 235, 228, 0.4)"
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
              style={({ pressed }) => [
                styles.loginButton,
                !canSendMagicLink && styles.loginButtonDisabled,
                pressed && canSendMagicLink && styles.pressed,
              ]}>
              <Text style={styles.loginButtonText}>Login</Text>
            </Pressable>
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

            <Pressable
              accessibilityRole="button"
              onPress={onFacebook}
              style={({ pressed }) => [styles.socialButton, styles.buttonFacebook, pressed && styles.pressed]}>
              <FacebookIcon size={22} color="#fff" />
              <Text style={[styles.socialButtonText, styles.socialButtonTextLight]}>Connect with Facebook</Text>
            </Pressable>
          </View>

          <Text style={styles.footnote}>Dummy auth for now — wiring real sign-in next.</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TrenaColors.background,
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
  header: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  subtitle: {
    color: 'rgba(236, 235, 228, 0.8)',
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
    color: 'rgba(236, 235, 228, 0.9)',
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    marginLeft: 4,
  },
  input: {
    backgroundColor: 'rgba(236, 235, 228, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: 'rgba(236, 235, 228, 0.95)',
    fontFamily: Fonts.regular,
    fontSize: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(236, 235, 228, 0.15)',
  },
  inputError: {
    borderColor: TrenaColors.accentRed,
    borderWidth: 1,
  },
  errorText: {
    color: TrenaColors.accentRed,
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginLeft: 4,
    marginTop: -4,
  },
  loginButton: {
    backgroundColor: TrenaColors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  loginButtonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    color: '#000',
    fontSize: 16,
    fontFamily: Fonts.black,
    letterSpacing: 0.3,
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
    backgroundColor: 'rgba(236, 235, 228, 0.25)',
  },
  dividerText: {
    color: 'rgba(236, 235, 228, 0.6)',
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
  buttonFacebook: {
    backgroundColor: '#1877F2',
    borderColor: '#1877F2',
  },
  socialButtonText: {
    color: '#000',
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  socialButtonTextLight: {
    color: '#fff',
  },
  footnote: {
    color: 'rgba(236, 235, 228, 0.5)',
    textAlign: 'center',
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 8,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
