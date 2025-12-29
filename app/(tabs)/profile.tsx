import { Fonts, rgba } from '@/constants/theme';
import { useAuthContext } from '@/hooks/use-auth-context';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import { supabase } from '@/lib/supabase';
import { Redirect, router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function getDisplayNameAndAvatar(meta: Record<string, unknown>) {
  const avatarUrl =
    (typeof meta.avatar_url === 'string' && meta.avatar_url) ||
    (typeof meta.picture === 'string' && meta.picture) ||
    undefined;
  const displayName =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    undefined;

  return { avatarUrl, displayName };
}

export default function ProfileScreen() {
  const { isLoading, isLoggedIn, session } = useAuthContext();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { colors, mode, setMode } = useTrenaTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const user = session?.user;
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const { avatarUrl, displayName } = getDisplayNameAndAvatar(meta);

  if (!isLoading && !isLoggedIn) {
    return <Redirect href="/" />;
  }

  const onSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      // Local sign-out (this device/session only).
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        Alert.alert('Sign out failed', error.message);
        return;
      }
      router.replace('/');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.profileCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Dark mode</Text>
              <Text style={styles.settingHint}>Switch between light and dark.</Text>
            </View>
            <Switch
              value={mode === 'dark'}
              onValueChange={(v) => setMode(v ? 'dark' : 'light')}
              trackColor={{
                false: rgba(colors.text, 0.18),
                true: rgba(colors.primary, 0.65),
              }}
              thumbColor={mode === 'dark' ? colors.primary : colors.surface}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.avatar}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder} />
              )}
            </View>

            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
                {displayName ?? 'Signed in'}
              </Text>
              <Text style={styles.email} numberOfLines={1} ellipsizeMode="tail">
                {user?.email ?? ''}
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onSignOut}
            disabled={isSigningOut}
            style={({ pressed }) => [
              styles.signOutButton,
              isSigningOut && styles.signOutButtonDisabled,
              pressed && !isSigningOut && styles.pressed,
            ]}
          >
            <Text style={styles.signOutButtonText}>{isSigningOut ? 'Signing out…' : 'Sign out'}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: {
  background: string;
  surface: string;
  primary: string;
  text: string;
  onSurface: string;
}) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      paddingHorizontal: 20,
      paddingVertical: 24,
      gap: 16,
    },
    title: {
      fontSize: 34,
      lineHeight: 40,
      fontFamily: Fonts.extraBold,
      color: colors.text,
      letterSpacing: -0.3,
    },
    profileCard: {
      backgroundColor: rgba(colors.text, 0.08),
      borderRadius: 18,
      padding: 16,
      gap: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: rgba(colors.text, 0.12),
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    settingText: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    settingLabel: {
      color: colors.text,
      fontSize: 16,
      fontFamily: Fonts.extraBold,
    },
    settingHint: {
      color: rgba(colors.text, 0.72),
      fontSize: 12,
      fontFamily: Fonts.regular,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: rgba(colors.text, 0.12),
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    avatar: {
      width: 54,
      height: 54,
      borderRadius: 27,
      overflow: 'hidden',
      backgroundColor: rgba(colors.text, 0.1),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: rgba(colors.text, 0.18),
      flexShrink: 0,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarPlaceholder: {
      flex: 1,
      backgroundColor: rgba(colors.text, 0.08),
    },
    info: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    name: {
      color: colors.text,
      fontSize: 18,
      lineHeight: 24,
      fontFamily: Fonts.extraBold,
    },
    email: {
      color: rgba(colors.text, 0.75),
      fontSize: 13,
      lineHeight: 18,
      fontFamily: Fonts.regular,
    },
    signOutButton: {
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: rgba(colors.text, 0.12),
    },
    signOutButtonDisabled: {
      opacity: 0.6,
    },
    signOutButtonText: {
      color: colors.onSurface,
      fontSize: 16,
      fontFamily: Fonts.black,
    },
    pressed: {
      transform: [{ scale: 0.99 }],
      opacity: 0.95,
    },
  });

