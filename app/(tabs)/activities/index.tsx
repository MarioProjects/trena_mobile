import { ActionSheet, ActionSheetOption } from '@/components/ui/ActionSheet';
import { Toast } from '@/components/ui/Toast';
import { Fonts, rgba } from '@/constants/theme';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    AppleIcon,
    BackpackIcon,
    BallIcon,
    BatteryIcon,
    BicycleIcon,
    BrainIcon,
    BugIcon,
    CarIcon,
    CharacterIcon,
    ChessIcon,
    DropIcon,
    DumbbellIcon,
    DuplicateIcon,
    FireIcon,
    HappyIcon,
    HourglassIcon,
    LeafIcon,
    LegIcon,
    MoreHorizIcon,
    MountainIcon,
    MuscleIcon,
    NeutralIcon,
    PinIcon,
    PizzaIcon,
    PlusIcon,
    RainIcon,
    RollerskateIcon,
    SadIcon,
    ShoeIcon,
    SkippingRopeIcon,
    SnowIcon,
    StarIcon,
    TrashIcon,
    VideoIcon,
    XIcon,
    YogaIcon,
} from '@/components/icons';
import { WorkoutsSkeleton } from '@/components/WorkoutsSkeleton';
import { deleteSession, duplicateSession, listSessions, updateSessionTitle } from '@/lib/workouts/repo';
import type { WorkoutTag } from '@/lib/workouts/tags';
import type { WorkoutSessionRow } from '@/lib/workouts/types';

const DrinkWaterIllustration = require('../../../assets/images/illustrations/activities/drink_water_yellow.webp');

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function bucketSessionsByDay(sessions: WorkoutSessionRow[]) {
  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const tomorrowStart = startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));

  const today: WorkoutSessionRow[] = [];
  const future: WorkoutSessionRow[] = [];
  const recent: WorkoutSessionRow[] = [];

  for (const s of sessions) {
    const t = new Date(s.started_at).getTime();
    if (Number.isNaN(t)) {
      recent.push(s);
      continue;
    }
    if (t >= todayStart && t < tomorrowStart) today.push(s);
    else if (t >= tomorrowStart) future.push(s);
    else recent.push(s);
  }

  // Keep UX sensible: today/recent are usually newest-first, future earliest-first.
  today.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  recent.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  future.sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());

  return { today, future, recent };
}

const PROGRAM_THRESHOLD_MS = 15 * 60 * 1000; // keep consistent with session screen

function WorkoutTagIcon({ tag, size = 16, color }: { tag: WorkoutTag; size?: number; color?: string }) {
  switch (tag) {
    case 'skippingrope':
      return <SkippingRopeIcon size={size} color={color} />;
    case 'leg':
      return <LegIcon size={size} color={color} />;
    case 'yoga':
      return <YogaIcon size={size} color={color} />;
    case 'chess':
      return <ChessIcon size={size} color={color} />;
    case 'bicycle':
      return <BicycleIcon size={size} color={color} />;
    case 'snow':
      return <SnowIcon size={size} color={color} />;
    case 'hourglass':
      return <HourglassIcon size={size} color={color} />;
    case 'pin':
      return <PinIcon size={size} color={color} />;
    case 'pizza':
      return <PizzaIcon size={size} color={color} />;
    case 'rollerskate':
      return <RollerskateIcon size={size} color={color} />;
    case 'apple':
      return <AppleIcon size={size} color={color} />;
    case 'backpack':
      return <BackpackIcon size={size} color={color} />;
    case 'mountain':
      return <MountainIcon size={size} color={color} />;
    case 'bug':
      return <BugIcon size={size} color={color} />;
    case 'rain':
      return <RainIcon size={size} color={color} />;
    case 'car':
      return <CarIcon size={size} color={color} />;
    case 'video':
      return <VideoIcon size={size} color={color} />;
    case 'battery':
      return <BatteryIcon size={size} color={color} />;
    case 'muscle':
      return <MuscleIcon size={size} color={color} />;
    case 'leaf':
      return <LeafIcon size={size} color={color} />;
    case 'ball':
      return <BallIcon size={size} color={color} />;
    case 'drop':
      return <DropIcon size={size} color={color} />;
    case 'fire':
      return <FireIcon size={size} color={color} />;
    case 'shoe':
      return <ShoeIcon size={size} color={color} />;
    case 'happy':
      return <HappyIcon size={size} color={color} />;
    case 'neutral':
      return <NeutralIcon size={size} color={color} />;
    case 'sad':
      return <SadIcon size={size} color={color} />;
    case 'dumbbell':
      return <DumbbellIcon size={size} color={color} />;
    case 'star':
      return <StarIcon size={size} color={color} />;
    case 'brain':
      return <BrainIcon size={size} color={color} />;
  }
}

export default function ActivitiesIndexScreen() {
  const { colors } = useTrenaTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{ toast?: string }>();

  const [sessions, setSessions] = React.useState<WorkoutSessionRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = React.useState<string | null>(null);
  const [menuTargetId, setMenuTargetId] = React.useState<string | null>(null);
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState('');
  const [isSavingRename, setIsSavingRename] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  const menuTarget = React.useMemo(() => (menuTargetId ? sessions.find((s) => s.id === menuTargetId) : null), [menuTargetId, sessions]);

  const hasLoaded = React.useRef(false);

  const [actionSheetVisible, setActionSheetVisible] = React.useState(false);
  const [actionSheetConfig, setActionSheetConfig] = React.useState<{
    title?: string;
    message?: string;
    options: ActionSheetOption[];
  }>({ options: [] });

  const showActionSheet = (config: { title?: string; message?: string; options: ActionSheetOption[] }) => {
    setActionSheetConfig(config);
    setActionSheetVisible(true);
  };

  const load = React.useCallback(async (opts?: { silent?: boolean }) => {
    const shouldLoad = !opts?.silent && !hasLoaded.current;
    if (shouldLoad) setIsLoading(true);
    try {
      // Fetch a bigger window so today/future/recent sections have enough data.
      const rows = await listSessions(200);
      setSessions(rows);
      hasLoaded.current = true;
    } finally {
      if (shouldLoad) setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  React.useEffect(() => {
    if (params.toast) {
      showToast(params.toast);
      // Clean up the URL so the toast doesn't reappear on reload/re-focus
      router.setParams({ toast: undefined } as any);
    }
  }, [params.toast]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  };

  const onDelete = (id: string) => {
    setMenuTargetId(null);
    showActionSheet({
      title: 'Delete workout?',
      message: 'This cannot be undone.',
      options: [
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(id);
              await deleteSession(id);
              setSessions((cur) => cur.filter((x) => x.id !== id));
              await load({ silent: true });
            } catch (e: any) {
              showToast(e?.message ?? 'Delete failed');
            } finally {
              setDeletingId(null);
            }
          },
        },
        { text: 'Cancel', style: 'cancel', onPress: () => {} },
      ],
    });
  };

  const onDuplicate = async (id: string) => {
    setMenuTargetId(null);
    try {
      setDuplicatingId(id);
      await duplicateSession(id);
      await load({ silent: true }); // Reload to show new session
      showToast('Workout duplicated');
    } catch (e: any) {
      showToast(e?.message ?? 'Duplicate failed');
    } finally {
      setDuplicatingId(null);
    }
  };

  const openRename = (id: string) => {
    const s = sessions.find((x) => x.id === id);
    setMenuTargetId(null);
    setRenamingId(id);
    setRenameValue(s?.title ?? '');
  };

  const closeRename = () => {
    setRenamingId(null);
    setRenameValue('');
    setIsSavingRename(false);
  };

  const onSaveRename = async () => {
    if (!renamingId) return;
    const nextTitle = renameValue.trim();
    if (!nextTitle) {
      showToast('Workout name cannot be empty');
      return;
    }
    try {
      setIsSavingRename(true);
      const updated = await updateSessionTitle({ id: renamingId, title: nextTitle });
      setSessions((cur) => cur.map((x) => (x.id === updated.id ? { ...x, title: updated.title } : x)));
      showToast('Workout renamed');
      closeRename();
    } catch (e: any) {
      showToast(e?.message ?? 'Rename failed');
      setIsSavingRename(false);
    }
  };

  const { today, future, recent } = React.useMemo(() => bucketSessionsByDay(sessions), [sessions]);
  const totalCount = sessions.length;
  const todaySectionTitle = !isLoading && totalCount === 0 ? 'Your workouts' : 'Today workouts';

  const renderSessionCard = (s: WorkoutSessionRow) => {
    const startedMs = new Date(s.started_at).getTime();
    const isScheduled = !s.ended_at && !Number.isNaN(startedMs) && startedMs > Date.now() + PROGRAM_THRESHOLD_MS;
    const inProgress = !s.ended_at && !isScheduled;
    const exCount = s.snapshot?.exercises?.length ?? 0;
    const isBusy = deletingId === s.id || duplicatingId === s.id;
    return (
      <View key={s.id} style={styles.card}>
        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={() => router.push(`/activities/session/${s.id}` as any)}
          style={({ pressed }) => [styles.cardPressable, pressed && styles.cardPressed]}
        >
          <View style={{ flex: 1, gap: 6 }}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {s.title}
              </Text>
              <View
                style={[
                  styles.badge,
                  isScheduled ? styles.badgeScheduled : inProgress ? styles.badgeInProgress : styles.badgeDone,
                ]}
              >
                <Text style={styles.badgeText}>{isScheduled ? 'SCHEDULED' : inProgress ? 'IN PROGRESS' : 'DONE'}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Options"
                disabled={isBusy}
                onPress={() => setMenuTargetId(s.id)}
                hitSlop={10}
                style={({ pressed }) => [styles.iconButton, pressed && !isBusy && { opacity: 0.85 }]}
              >
                <MoreHorizIcon size={24} color={colors.text} />
              </Pressable>
            </View>
            <Text style={styles.cardMeta}>{`${formatDate(s.started_at)} • ${exCount} exercise${exCount === 1 ? '' : 's'}`}</Text>
          </View>
        </Pressable>

        {s.tags && s.tags.length > 0 ? (
          <View style={styles.cardTags} pointerEvents="none">
            {s.tags.slice(0, 3).map((tag) => (
              <WorkoutTagIcon key={tag} tag={tag} size={16} color={rgba(colors.text, 0.7)} />
            ))}
          </View>
        ) : null}

        {isBusy ? (
          <View style={styles.cardOverlay} pointerEvents="none">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Activities</Text>

          <View style={[styles.section, !isLoading && totalCount === 0 && styles.sectionFill]}>
            <Text style={styles.sectionTitle}>{todaySectionTitle}</Text>
            {isLoading ? (
              <WorkoutsSkeleton />
            ) : totalCount === 0 ? (
              <View style={styles.emptyStateContent}>
                <Text style={styles.body}>No workouts yet. Start your first session to see it here.</Text>
                <View style={styles.emptyIllustrationWrapper}>
                  <Image source={DrinkWaterIllustration} style={styles.emptyImage} resizeMode="contain" />
                </View>
              </View>
            ) : today.length === 0 ? (
              <Text style={styles.body}>No workouts logged today.</Text>
            ) : (
              <View style={styles.list}>{today.map(renderSessionCard)}</View>
            )}
          </View>

          {!isLoading && totalCount > 0 ? (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Future workouts</Text>
                {future.length === 0 ? (
                  <Text style={styles.body}>No future workouts.</Text>
                ) : (
                  <View style={styles.list}>{future.map(renderSessionCard)}</View>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent workouts</Text>
                {recent.length === 0 ? (
                  <Text style={styles.body}>No recent workouts.</Text>
                ) : (
                  <View style={styles.list}>{recent.map(renderSessionCard)}</View>
                )}
              </View>
            </>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/activities/start' as any)}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <PlusIcon size={20} color="#141B34" strokeWidth={1.5} />
            <Text style={styles.primaryButtonText}>Start workout</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={!!menuTargetId} transparent animationType="fade" onRequestClose={() => setMenuTargetId(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuTargetId(null)}>
          <View style={styles.menuSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.menuTitle} numberOfLines={1}>
              {menuTarget?.title ?? 'Workout'}
            </Text>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => menuTargetId && openRename(menuTargetId)}
            >
              <CharacterIcon size={20} color={colors.text} />
              <Text style={styles.menuItemText}>Rename Workout</Text>
            </Pressable>

            <View style={styles.menuSeparator} />

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => menuTargetId && onDuplicate(menuTargetId)}
            >
              <DuplicateIcon size={20} color={colors.text} />
              <Text style={styles.menuItemText}>Duplicate Workout</Text>
            </Pressable>

            <View style={styles.menuSeparator} />

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => menuTargetId && onDelete(menuTargetId)}
            >
              <TrashIcon size={20} color={colors.accentRed} />
              <Text style={[styles.menuItemText, { color: colors.accentRed }]}>Remove Workout</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={!!renamingId} transparent animationType="fade" onRequestClose={closeRename}>
        <Pressable style={styles.modalBackdrop} onPress={closeRename}>
          <View style={styles.renameCard} onStartShouldSetResponder={() => true}>
            <View style={styles.renameHeader}>
              <Text style={styles.renameTitle}>Rename workout</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={closeRename}
                hitSlop={10}
                style={({ pressed }) => [styles.renameClose, pressed && { opacity: 0.8 }]}
              >
                <XIcon size={18} color={colors.text} />
              </Pressable>
            </View>

            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Workout name"
              placeholderTextColor={rgba(colors.text, 0.5)}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={onSaveRename}
              editable={!isSavingRename}
              style={styles.renameInput}
            />

            <View style={styles.renameActionsRow}>
              <Pressable
                accessibilityRole="button"
                onPress={closeRename}
                disabled={isSavingRename}
                style={({ pressed }) => [styles.secondaryButton, pressed && !isSavingRename && styles.pressed, { flex: 1 }]}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onSaveRename}
                disabled={isSavingRename}
                style={({ pressed }) => [styles.primaryButton, (pressed || isSavingRename) && styles.pressed, { flex: 1 }]}
              >
                <Text style={styles.primaryButtonText}>{isSavingRename ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      <ActionSheet
        visible={actionSheetVisible}
        title={actionSheetConfig.title}
        message={actionSheetConfig.message}
        options={actionSheetConfig.options}
        onClose={() => setActionSheetVisible(false)}
      />

      <Toast 
        message={toast || ''} 
        visible={!!toast} 
        onHide={() => setToast(null)} 
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: {
  background: string;
  surface: string;
  primary: string;
  text: string;
  accentRed: string;
  onPrimary: string;
}) =>
  StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 14,
    flexGrow: 1,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontFamily: Fonts.extraBold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  section: {
    gap: 10,
    paddingTop: 6,
  },
  sectionFill: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    lineHeight: 22,
    color: colors.text,
    letterSpacing: -0.2,
  },
  body: {
    color: rgba(colors.text, 0.8),
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    // kept for compatibility if reused elsewhere
  },
  emptyStateContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  emptyImage: {
    width: '100%',
    maxWidth: 380,
    height: 320,
  },
  emptyIllustrationWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    backgroundColor: colors.primary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.25)',
    width: '100%',
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontFamily: Fonts.extraBold,
  },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: rgba(colors.text, 0.08),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: rgba(colors.text, 0.12),
    minWidth: 110,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.95,
  },
  list: {
    gap: 12,
  },
  card: {
    position: 'relative',
    borderWidth: 1,
    borderColor: rgba(colors.text, 0.12),
    backgroundColor: rgba(colors.text, 0.04),
    padding: 12,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 12,
  },
  cardPressable: {
    flex: 1,
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 20, 17, 0.55)',
    borderRadius: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.text,
    flex: 1,
  },
  cardMeta: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: rgba(colors.text, 0.75),
  },
  cardTags: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    opacity: 0.95,
  },
  badge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeInProgress: {
    borderColor: 'rgba(255, 214, 0, 0.35)',
    backgroundColor: 'rgba(255, 214, 0, 0.10)',
  },
  badgeDone: {
    borderColor: 'rgba(70, 255, 150, 0.25)',
    backgroundColor: 'rgba(70, 255, 150, 0.08)',
  },
  badgeScheduled: {
    borderColor: 'rgba(59, 130, 246, 0.45)',
    backgroundColor: 'rgba(59, 130, 246, 0.16)',
  },
  badgeText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.5,
    color: rgba(colors.text, 0.85),
  },

  iconButton: {
    padding: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: colors.background,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingBottom: 16, // Safe area hint
  },
  menuTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: rgba(colors.text, 0.6),
    textAlign: 'center',
    paddingVertical: 8,
    marginBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  menuItemPressed: {
    opacity: 0.7,
  },
  menuItemText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  menuSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: rgba(colors.text, 0.1),
  },

  renameCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: rgba(colors.text, 0.12),
    padding: 16,
    gap: 12,
  },
  renameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  renameTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 16,
    color: colors.text,
  },
  renameClose: {
    padding: 6,
  },
  renameInput: {
    borderWidth: 1,
    borderColor: rgba(colors.text, 0.12),
    backgroundColor: rgba(colors.text, 0.04),
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
    fontFamily: Fonts.medium,
    fontSize: 14,
  },
  renameActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  });
