import { Fonts, TrenaColors } from '@/constants/theme';
import { useAuthContext } from '@/hooks/use-auth-context';
import { supabase } from '@/lib/supabase';
import { Redirect, router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: TrenaColors.background,
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
    color: TrenaColors.text,
    letterSpacing: -0.3,
  },
  profileCard: {
    backgroundColor: 'rgba(236, 235, 228, 0.08)',
    borderRadius: 18,
    padding: 16,
    gap: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(236, 235, 228, 0.12)',
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
    backgroundColor: 'rgba(236, 235, 228, 0.1)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(236, 235, 228, 0.18)',
    flexShrink: 0,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    backgroundColor: 'rgba(236, 235, 228, 0.08)',
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  name: {
    color: TrenaColors.text,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: Fonts.extraBold,
  },
  email: {
    color: 'rgba(236, 235, 228, 0.75)',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.regular,
  },
  signOutButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: TrenaColors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(236, 235, 228, 0.12)',
  },
  signOutButtonDisabled: {
    opacity: 0.6,
  },
  signOutButtonText: {
    color: '#141B34',
    fontSize: 16,
    fontFamily: Fonts.black,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.95,
  },
});

