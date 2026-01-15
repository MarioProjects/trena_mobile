import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { ChevronLeftIcon } from '@/components/icons';
import { ActionSheet, ActionSheetOption } from '@/components/ui/ActionSheet';
import { Fonts, rgba } from '@/constants/theme';
import { useHaptics } from '@/hooks/use-haptics';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import { sendOTP, verifyOTP } from '@/lib/email-auth';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyOTPScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const haptics = useHaptics();
  const { colors } = useTrenaTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const inputRefs = useRef<(TextInput | null)[]>([]);

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

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  const canResend = resendCooldown === 0 && !isResending;
  const otpString = otp.join('');
  const isOtpComplete = otpString.length === OTP_LENGTH;

  const handleOtpChange = useCallback((value: string, index: number) => {
    // Handle paste of full OTP
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < OTP_LENGTH) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      
      // Focus on the next empty input or last input
      const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    // Single digit input
    const digit = value.replace(/\D/g, '');
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-focus next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [otp]);

  const handleKeyPress = useCallback((key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      inputRefs.current[index - 1]?.focus();
    }
  }, [otp]);

  const onVerify = useCallback(async () => {
    if (!isOtpComplete || !email) return;

    haptics.light();
    setIsVerifying(true);
    Keyboard.dismiss();

    const result = await verifyOTP(email, otpString);

    setIsVerifying(false);

    if (result.success) {
      haptics.success();
      router.replace('/today');
    } else {
      haptics.error();
      showActionSheet({
        title: 'Invalid code',
        message: result.error ?? 'The code you entered is incorrect. Please try again.',
        options: [
          {
            text: 'Try again',
            onPress: () => {
              setOtp(Array(OTP_LENGTH).fill(''));
              inputRefs.current[0]?.focus();
            },
          },
        ],
      });
    }
  }, [email, haptics, isOtpComplete, otpString]);

  const onResend = useCallback(async () => {
    if (!canResend || !email) return;

    haptics.light();
    setIsResending(true);

    const result = await sendOTP(email);

    setIsResending(false);

    if (result.success) {
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      showActionSheet({
        title: 'Code sent',
        message: `We sent a new verification code to ${email}`,
        options: [{ text: 'OK', onPress: () => {} }],
      });
    } else {
      showActionSheet({
        title: 'Failed to resend',
        message: result.error ?? 'Could not send a new code. Please try again.',
        options: [{ text: 'OK', onPress: () => {} }],
      });
    }
  }, [canResend, email, haptics]);

  // Auto-verify when OTP is complete
  useEffect(() => {
    if (isOtpComplete && !isVerifying) {
      onVerify();
    }
  }, [isOtpComplete, isVerifying, onVerify]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {/* Back Button */}
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
            <Text style={styles.title}>Enter verification code</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to{'\n'}
              <Text style={styles.emailText}>{email}</Text>
            </Text>
          </View>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                value={digit}
                onChangeText={(text) => handleOtpChange(text, index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                onFocus={() => setFocusedIndex(index)}
                keyboardType="number-pad"
                maxLength={index === 0 ? OTP_LENGTH : 1}
                selectTextOnFocus
                style={[
                  styles.otpInput,
                  focusedIndex === index && styles.otpInputFocused,
                  digit && styles.otpInputFilled,
                ]}
              />
            ))}
          </View>

          {/* Verify Button */}
          <Pressable
            accessibilityRole="button"
            onPress={onVerify}
            disabled={!isOtpComplete || isVerifying}
            style={({ pressed }) => [
              styles.verifyButton,
              (!isOtpComplete || isVerifying) && styles.verifyButtonDisabled,
              pressed && isOtpComplete && !isVerifying && styles.pressed,
            ]}>
            {isVerifying ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.verifyButtonText}>Verify</Text>
            )}
          </Pressable>

          {/* Resend Section */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code?</Text>
            {canResend ? (
              <Pressable
                accessibilityRole="button"
                onPress={onResend}
                disabled={isResending}
                hitSlop={8}>
                {isResending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.resendLink}>Resend code</Text>
                )}
              </Pressable>
            ) : (
              <Text style={styles.resendTimer}>
                Resend in {formatTime(resendCooldown)}
              </Text>
            )}
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

const createStyles = (colors: {
  background: string;
  primary: string;
  text: string;
  onPrimary: string;
}) =>
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
    },
    title: {
      fontSize: 28,
      fontFamily: Fonts.black,
      color: colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      fontFamily: Fonts.regular,
      color: rgba(colors.text, 0.7),
      textAlign: 'center',
      lineHeight: 24,
    },
    emailText: {
      fontFamily: Fonts.bold,
      color: colors.text,
    },
    otpContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
    },
    otpInput: {
      width: 48,
      height: 56,
      borderWidth: 2,
      borderColor: rgba(colors.text, 0.2),
      borderRadius: 12,
      fontSize: 24,
      fontFamily: Fonts.bold,
      color: colors.text,
      textAlign: 'center',
      backgroundColor: rgba(colors.text, 0.05),
    },
    otpInputFocused: {
      borderColor: colors.primary,
      backgroundColor: rgba(colors.primary, 0.08),
    },
    otpInputFilled: {
      borderColor: colors.primary,
      backgroundColor: rgba(colors.primary, 0.12),
    },
    verifyButton: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
    },
    verifyButtonDisabled: {
      opacity: 0.5,
    },
    verifyButtonText: {
      color: colors.onPrimary,
      fontSize: 17,
      fontFamily: Fonts.black,
      letterSpacing: 0.3,
    },
    resendContainer: {
      alignItems: 'center',
      gap: 8,
    },
    resendText: {
      fontSize: 14,
      fontFamily: Fonts.regular,
      color: rgba(colors.text, 0.6),
    },
    resendLink: {
      fontSize: 15,
      fontFamily: Fonts.bold,
      color: colors.primary,
    },
    resendTimer: {
      fontSize: 14,
      fontFamily: Fonts.semiBold,
      color: rgba(colors.text, 0.5),
    },
    pressed: {
      transform: [{ scale: 0.98 }],
      opacity: 0.9,
    },
  });
