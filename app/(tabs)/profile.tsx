import { CalendarIcon, ChevronLeftIcon, EditIcon, EnergyIcon, ViewIcon } from '@/components/icons';
import { ActionSheet, ActionSheetOption } from '@/components/ui/ActionSheet';
import { Fonts, rgba, TrenaDarkColors, TrenaMonoBlueColors } from '@/constants/theme';
import { useAuthContext } from '@/hooks/use-auth-context';
import { useHaptics } from '@/hooks/use-haptics';
import { useSettings } from '@/hooks/use-settings';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import { cancelAllReminders, requestNotificationPermissions } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { rescheduleAllReminders } from '@/lib/workouts/repo';
import { decode } from 'base64-arraybuffer';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
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
  const { isLoading, isLoggedIn, session, profile, refreshProfile, isDemo, signOutDemo } = useAuthContext();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { colors, mode, setMode } = useTrenaTheme();
  const { settings, updateSetting } = useSettings();
  const haptics = useHaptics();
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

  const user = session?.user;
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const { avatarUrl: metaAvatar, displayName: metaName } = getDisplayNameAndAvatar(meta);

  // Favor the profiles table but fall back to Auth metadata
  const avatarUrl = profile?.avatar_url || metaAvatar;
  const displayName = profile?.display_name || metaName;

  const memberSince = useMemo(() => {
    if (!user?.created_at) return '';
    const date = new Date(user.created_at);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }, [user?.created_at]);

  if (!isLoading && !isLoggedIn) {
    return <Redirect href="/" />;
  }

  const onEditAvatar = () => {
    showActionSheet({
      title: 'Change Profile Picture',
      options: [
        {
          text: 'Take Photo',
          onPress: () => pickImage(true),
        },
        {
          text: 'Choose from Gallery',
          onPress: () => pickImage(false),
        },
      ],
    });
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission required',
          `We need access to your ${useCamera ? 'camera' : 'gallery'} to change your profile picture.`
        );
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
          });

      if (!result.canceled && result.assets[0].base64) {
        await uploadAvatar(result.assets[0].base64, result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert('Selection error', error.message);
    }
  };

  const uploadAvatar = async (base64: string, uri: string) => {
    if (!user) return;
    try {
      setIsUploading(true);
      const fileExt = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const folderPath = user.id;
      const fileName = `${folderPath}/${Date.now()}.${fileExt}`;

      // 1. Clean up existing files in the user's folder to save space
      const { data: existingFiles } = await supabase.storage.from('avatars').list(folderPath);

      // 2. Upload the new file
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, decode(base64), {
        contentType: `image/${fileExt}`,
        upsert: true,
      });

      if (uploadError) throw uploadError;

      // 3. Update the user's profile with the new URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName);

      // Update both User Metadata AND the profiles table for permanence.
      // OAuth logins can sometimes overwrite or mask user_metadata.
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });

      if (updateError) throw updateError;

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      await refreshProfile();

      // 4. Clean up OLD files ONLY after successful upload and profile update
      if (existingFiles && existingFiles.length > 0) {
        const pathsToDelete = existingFiles.map((f) => `${folderPath}/${f.name}`);
        const { error: deleteError } = await supabase.storage.from('avatars').remove(pathsToDelete);

        if (deleteError) {
          console.error('Cleanup failed (check DELETE permissions):', deleteError.message);
        }
      }
    } catch (error: any) {
      Alert.alert('Upload failed', error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const onSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      if (isDemo) {
        signOutDemo();
        router.replace('/');
        return;
      }
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        showActionSheet({
          title: 'Sign out failed',
          message: error.message,
          options: [{ text: 'OK', onPress: () => {} }],
        });
        return;
      }
      router.replace('/');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeftIcon size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Athlete Profile</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <Pressable onPress={onEditAvatar} disabled={isUploading} style={styles.avatarContainer}>
            <View style={styles.avatarBorder}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <ViewIcon size={64} color={rgba(colors.text, 0.2)} />
                </View>
              )}
              {isUploading && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              )}
            </View>
            <View style={styles.editBadge}>
              <EditIcon size={16} color={colors.text} strokeWidth={2.5} />
            </View>
          </Pressable>

          <Text style={styles.displayName}>{displayName}</Text>
          {memberSince ? <Text style={styles.memberSince}>Member since {memberSince}</Text> : null}
        </View>

        <Text style={styles.sectionTitle}>Account Settings</Text>

        <View style={styles.settingsList}>
          {/* Theme/Appearance */}
          <Pressable
            style={styles.settingItem}
            onPress={() => {
              showActionSheet({
                title: 'Select Appearance',
                options: [
                  {
                    text: 'Dark',
                    onPress: () => setMode('dark'),
                    tint: {
                      backgroundColor: TrenaDarkColors.background,
                      textColor: TrenaDarkColors.text,
                      borderColor: rgba(TrenaDarkColors.text, 0.1),
                    },
                  },
                  {
                    text: 'Mono Blue',
                    onPress: () => setMode('mono-blue'),
                    tint: {
                      backgroundColor: TrenaMonoBlueColors.primary,
                      textColor: TrenaMonoBlueColors.onPrimary,
                    },
                  },
                ],
              });
              haptics.light();
            }}
          >
            <View style={[styles.iconWrapper, { backgroundColor: rgba(colors.primary, 0.15) }]}>
              <ViewIcon size={22} color={colors.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Appearance</Text>
              <Text style={styles.settingSubtitle}>
                {mode === 'dark' ? 'Dark theme' : 'Mono Blue theme'}
              </Text>
            </View>
            <ChevronLeftIcon
              size={20}
              color={rgba(colors.text, 0.3)}
              style={{ transform: [{ rotate: '180deg' }] }}
            />
          </Pressable>

          {/* Notifications */}
          <View style={styles.settingItem}>
            <View style={[styles.iconWrapper, { backgroundColor: rgba(colors.secondary, 0.15) }]}>
              <CalendarIcon size={22} color={colors.secondary} strokeWidth={2} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Workout Reminders</Text>
              <Text style={styles.settingSubtitle}>Notify when a plan is due</Text>
            </View>
            <Switch
              value={settings.notifications}
              onValueChange={async (v) => {
                haptics.light();
                if (v) {
                  const hasPermission = await requestNotificationPermissions();
                  if (!hasPermission) {
                    Alert.alert(
                      'Notifications Disabled',
                      'Please enable notification permissions in your device settings to receive workout reminders.',
                      [{ text: 'OK' }]
                    );
                    return;
                  }
                  updateSetting('notifications', true);
                  await rescheduleAllReminders();
                } else {
                  updateSetting('notifications', false);
                  await cancelAllReminders();
                }
              }}
              trackColor={{ false: rgba(colors.text, 0.1), true: rgba(colors.secondary, 0.5) }}
              thumbColor={settings.notifications ? colors.secondary : '#f4f3f4'}
            />
          </View>

          {/* Haptics */}
          <View style={styles.settingItem}>
            <View style={[styles.iconWrapper, { backgroundColor: rgba(colors.tertiary, 0.15) }]}>
              <EnergyIcon size={22} color={colors.tertiary} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Haptic Feedback</Text>
              <Text style={styles.settingSubtitle}>Vibrate on interactions</Text>
            </View>
            <Switch
              value={settings.haptics}
              onValueChange={(v) => {
                updateSetting('haptics', v);
                // Fire haptic directly if turning on, to confirm it works
                if (v) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                else haptics.light();
              }}
              trackColor={{ false: rgba(colors.tertiary, 0.1), true: rgba(colors.tertiary, 0.5) }}
              thumbColor={settings.haptics ? colors.tertiary : '#f4f3f4'}
            />
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
          <Text style={styles.signOutButtonText}>{isSigningOut ? 'Logging Out…' : 'Log Out'}</Text>
        </Pressable>

        <Text style={styles.versionText}>VERSION {Constants.expoConfig?.version ?? '1.0.0'}</Text>
      </ScrollView>

      <ActionSheet
        visible={actionSheetVisible}
        title={actionSheetConfig.title}
        message={actionSheetConfig.message}
        options={actionSheetConfig.options}
        onClose={() => setActionSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  tertiary: string;
  accentRed: string;
  text: string;
  onSurface: string;
  onSecondary: string;
}) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      height: 56,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontFamily: Fonts.extraBold,
      color: colors.text,
      textAlign: 'center',
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingBottom: 40,
    },
    profileSection: {
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 32,
    },
    avatarContainer: {
      marginBottom: 20,
    },
    avatarBorder: {
      width: 140,
      height: 140,
      borderRadius: 70,
      borderWidth: 4,
      borderColor: colors.primary,
      padding: 4,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      position: 'relative',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 66,
    },
    avatarPlaceholder: {
      width: '100%',
      height: '100%',
      borderRadius: 66,
      backgroundColor: rgba(colors.text, 0.05),
      justifyContent: 'center',
      alignItems: 'center',
    },
    uploadOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: rgba('#000000', 0.4),
      justifyContent: 'center',
      alignItems: 'center',
    },
    editBadge: {
      position: 'absolute',
      bottom: 4,
      right: 4,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 3,
      borderColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      // Subtle shadow matching the cards
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    displayName: {
      fontSize: 32,
      fontFamily: Fonts.extraBold,
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    badge: {
      paddingHorizontal: 16,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: rgba(colors.primary, 0.4),
      backgroundColor: rgba(colors.primary, 0.05),
      marginBottom: 12,
    },
    badgeText: {
      fontSize: 14,
      fontFamily: Fonts.bold,
      color: colors.primary,
      letterSpacing: 1,
    },
    memberSince: {
      fontSize: 16,
      fontFamily: Fonts.regular,
      color: rgba(colors.text, 0.5),
    },
    sectionTitle: {
      fontSize: 22,
      fontFamily: Fonts.extraBold,
      color: colors.text,
      marginBottom: 16,
    },
    settingsList: {
      gap: 12,
      marginBottom: 40,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 16,
      gap: 16,
      borderWidth: 1,
      borderColor: rgba(colors.text, 0.05),
      // Shadow for iOS
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      // Elevation for Android
      elevation: 2,
    },
    iconWrapper: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    settingInfo: {
      flex: 1,
      gap: 2,
    },
    settingTitle: {
      fontSize: 17,
      fontFamily: Fonts.bold,
      color: colors.text,
    },
    settingSubtitle: {
      fontSize: 14,
      fontFamily: Fonts.regular,
      color: rgba(colors.text, 0.4),
    },
    signOutButton: {
      backgroundColor: rgba(colors.accentRed, 0.1),
      paddingVertical: 18,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      borderWidth: 1.5,
      borderColor: rgba(colors.accentRed, 0.2),
    },
    signOutButtonDisabled: {
      opacity: 0.5,
    },
    signOutButtonText: {
      color: colors.accentRed,
      fontSize: 18,
      fontFamily: Fonts.bold,
    },
    pressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
    versionText: {
      fontSize: 12,
      fontFamily: Fonts.bold,
      color: rgba(colors.text, 0.3),
      textAlign: 'center',
      letterSpacing: 1,
    },
  });

